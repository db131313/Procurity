"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getProject } from "@/lib/db/store";
import { hasJobsAccess } from "@/lib/jobs/access";
import {
  acceptQuoteByToken,
  addMeasurement,
  advanceJobStatus,
  createInvoicesForJob,
  createJob,
  createQuoteDraft,
  deleteMeasurement,
  getJobBundle,
  replaceLineItems,
  updateJob,
  updateQuote,
  upsertDesignSpec,
} from "@/lib/jobs/store";
import { buildQuotePdf } from "@/lib/jobs/pdf";
import { storeJobFile } from "@/lib/jobs/storage";
import { sendQuoteEmail } from "@/lib/jobs/email";
import type {
  JobStatus,
  LineItemCategory,
  MeasureUnit,
  MeasurementAnnotation,
} from "@/lib/jobs/types";

export type StartJobResult =
  | { ok: true }
  | { ok: false; error: string };

async function requireJobsUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (!hasJobsAccess(user)) throw new Error("Jobs requires a paid plan");
  return user;
}

function revalidateJob(jobId: string) {
  revalidatePath("/app/jobs");
  revalidatePath(`/app/jobs/${jobId}`);
}

/**
 * Create a job from a map project. Redirects on success.
 * Returns `{ ok: false, error }` on failure so callers can show UI
 * (auth/plan failures never throw; redirect only runs after create succeeds).
 */
export async function startJobFromProject(
  projectId: string,
): Promise<StartJobResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Unauthorized" };
  if (!hasJobsAccess(user)) {
    return { ok: false, error: "Jobs requires a paid plan" };
  }

  let jobId: string;
  try {
    const project = await getProject(projectId);
    const job = await createJob({
      ownerId: user.id,
      projectId: project?.id ?? projectId,
      siteAddress: project
        ? [project.address, project.borough, project.zip]
            .filter(Boolean)
            .join(", ")
        : "",
      customerName: project?.ownerName || project?.gcName || "",
    });
    jobId = job.id;
    revalidateJob(job.id);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not create job",
    };
  }
  redirect(`/app/jobs/${jobId}`);
}

/**
 * Create a blank job. Redirects on success; returns error object on failure.
 */
export async function startBlankJob(): Promise<StartJobResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Unauthorized" };
  if (!hasJobsAccess(user)) {
    return { ok: false, error: "Jobs requires a paid plan" };
  }

  let jobId: string;
  try {
    const job = await createJob({ ownerId: user.id });
    jobId = job.id;
    revalidateJob(job.id);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not create job",
    };
  }
  redirect(`/app/jobs/${jobId}`);
}

export async function saveJobStartAction(
  jobId: string,
  data: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    siteAddress: string;
    projectId?: string | null;
    advance?: boolean;
  },
) {
  const user = await requireJobsUser();
  const job = await updateJob(jobId, user.id, {
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    customerPhone: data.customerPhone,
    siteAddress: data.siteAddress,
    projectId: data.projectId ?? null,
    ...(data.advance ? { status: "site_capture" as JobStatus } : {}),
  });
  if (!job) throw new Error("Job not found");
  revalidateJob(jobId);
  return { ok: true };
}

export async function setJobStageAction(jobId: string, status: JobStatus) {
  const user = await requireJobsUser();
  await advanceJobStatus(jobId, user.id, status);
  revalidateJob(jobId);
  return { ok: true };
}

export async function addMeasurementAction(
  jobId: string,
  data: {
    label: string;
    width?: number | null;
    height?: number | null;
    unit?: MeasureUnit;
    annotation?: MeasurementAnnotation | null;
  },
) {
  const user = await requireJobsUser();
  const row = await addMeasurement(jobId, user.id, data);
  if (!row) throw new Error("Could not add measurement");
  revalidateJob(jobId);
  return row;
}

export async function deleteMeasurementAction(
  jobId: string,
  measurementId: string,
) {
  const user = await requireJobsUser();
  await deleteMeasurement(measurementId, user.id);
  revalidateJob(jobId);
  return { ok: true };
}

export async function saveDesignAction(
  jobId: string,
  data: {
    signType: string;
    description: string;
    notes: string;
    advance?: boolean;
  },
) {
  const user = await requireJobsUser();
  await upsertDesignSpec(jobId, user.id, data);
  if (data.advance) await advanceJobStatus(jobId, user.id, "estimate");
  revalidateJob(jobId);
  return { ok: true };
}

export async function saveLineItemsAction(
  jobId: string,
  items: Array<{
    id?: string;
    category: LineItemCategory;
    description: string;
    qty: number;
    unitCost: number;
    markupPct: number;
    catalogKey?: string | null;
  }>,
  taxRatePct?: number,
) {
  const user = await requireJobsUser();
  if (taxRatePct != null) {
    await updateJob(jobId, user.id, { taxRatePct });
  }
  const rows = await replaceLineItems(jobId, user.id, items);
  if (!rows) throw new Error("Could not save line items");
  revalidateJob(jobId);
  return { ok: true };
}

export async function generateQuotePdfAction(jobId: string) {
  const user = await requireJobsUser();
  let quote = await createQuoteDraft(jobId, user.id);
  if (!quote) throw new Error("Could not create quote");
  const bundle = await getJobBundle(jobId, user.id);
  if (!bundle) throw new Error("Job not found");
  const pdf = await buildQuotePdf(bundle, quote.id);
  const stored = await storeJobFile({
    jobId,
    fileName: `quote-v${quote.version}.pdf`,
    mimeType: "application/pdf",
    bytes: pdf,
    folder: "quotes",
  });
  quote = await updateQuote(quote.id, user.id, { pdfUrl: stored.url });
  revalidateJob(jobId);
  return quote;
}

export async function sendQuoteAction(jobId: string, quoteId: string) {
  const user = await requireJobsUser();
  const bundle = await getJobBundle(jobId, user.id);
  if (!bundle) throw new Error("Job not found");
  const quote = bundle.quotes.find((q) => q.id === quoteId);
  if (!quote) throw new Error("Quote not found");
  if (!bundle.job.customerEmail) throw new Error("Customer email required");

  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  const acceptUrl = `${base}/quote/${quote.acceptToken}`;
  const sent = await sendQuoteEmail({
    to: bundle.job.customerEmail,
    customerName: bundle.job.customerName,
    companyName: bundle.job.companyName,
    acceptUrl,
    totalLabel: `$${quote.total.toFixed(2)}`,
  });
  if (!sent.ok) throw new Error(sent.error || "Email failed");
  await updateQuote(quoteId, user.id, {
    status: "sent",
    sentAt: new Date().toISOString(),
  });
  revalidateJob(jobId);
  return { ok: true, stub: sent.stub, acceptUrl };
}

export async function acceptQuotePublicAction(token: string) {
  const bundle = await acceptQuoteByToken(token);
  if (!bundle) throw new Error("Quote not found");
  revalidatePath(`/quote/${token}`);
  revalidateJob(bundle.job.id);
  return { ok: true, jobId: bundle.job.id };
}

export async function setupInvoicesAction(
  jobId: string,
  mode: "full" | "deposit_balance",
) {
  const user = await requireJobsUser();
  const invoices = await createInvoicesForJob(jobId, user.id, mode);
  if (!invoices) throw new Error("Could not create invoices");
  revalidateJob(jobId);
  return invoices;
}
