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
  QuoteRecord,
  InvoiceRecord,
} from "@/lib/jobs/types";

export type StartJobResult =
  | { ok: true }
  | { ok: false; error: string };

export type ActionResult<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

function errorMessage(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  return "Something went wrong";
}

/** Log the real error + React digest so Netlify logs identify the action. */
function logActionError(action: string, e: unknown) {
  const digest =
    e && typeof e === "object" && "digest" in e
      ? String((e as { digest?: unknown }).digest)
      : undefined;
  console.error(`[jobs/action:${action}]`, {
    message: errorMessage(e),
    digest,
    stack: e instanceof Error ? e.stack : undefined,
  });
}

async function requireJobsUser(): Promise<
  | { ok: true; user: Awaited<ReturnType<typeof getCurrentUser>> & object }
  | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Unauthorized" };
  if (!hasJobsAccess(user)) {
    return { ok: false, error: "Jobs requires a paid plan" };
  }
  return { ok: true, user };
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
    logActionError("startJobFromProject", e);
    return {
      ok: false,
      error: errorMessage(e) || "Could not create job",
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
    logActionError("startBlankJob", e);
    return {
      ok: false,
      error: errorMessage(e) || "Could not create job",
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
): Promise<ActionResult> {
  try {
    const auth = await requireJobsUser();
    if (!auth.ok) return auth;
    const job = await updateJob(jobId, auth.user.id, {
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      siteAddress: data.siteAddress,
      projectId: data.projectId ?? null,
      ...(data.advance ? { status: "site_capture" as JobStatus } : {}),
    });
    if (!job) return { ok: false, error: "Job not found" };
    revalidateJob(jobId);
    return { ok: true };
  } catch (e) {
    logActionError("saveJobStartAction", e);
    return { ok: false, error: errorMessage(e) };
  }
}

export async function setJobStageAction(
  jobId: string,
  status: JobStatus,
): Promise<ActionResult> {
  try {
    const auth = await requireJobsUser();
    if (!auth.ok) return auth;
    await advanceJobStatus(jobId, auth.user.id, status);
    revalidateJob(jobId);
    return { ok: true };
  } catch (e) {
    logActionError("setJobStageAction", e);
    return { ok: false, error: errorMessage(e) };
  }
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
): Promise<ActionResult<{ measurementId: string }>> {
  try {
    const auth = await requireJobsUser();
    if (!auth.ok) return auth;
    const row = await addMeasurement(jobId, auth.user.id, data);
    if (!row) return { ok: false, error: "Could not add measurement" };
    revalidateJob(jobId);
    return { ok: true, measurementId: row.id };
  } catch (e) {
    logActionError("addMeasurementAction", e);
    return { ok: false, error: errorMessage(e) };
  }
}

export async function deleteMeasurementAction(
  jobId: string,
  measurementId: string,
): Promise<ActionResult> {
  try {
    const auth = await requireJobsUser();
    if (!auth.ok) return auth;
    await deleteMeasurement(measurementId, auth.user.id);
    revalidateJob(jobId);
    return { ok: true };
  } catch (e) {
    logActionError("deleteMeasurementAction", e);
    return { ok: false, error: errorMessage(e) };
  }
}

export async function saveDesignAction(
  jobId: string,
  data: {
    signType: string;
    description: string;
    notes: string;
    advance?: boolean;
  },
): Promise<ActionResult> {
  try {
    const auth = await requireJobsUser();
    if (!auth.ok) return auth;
    await upsertDesignSpec(jobId, auth.user.id, data);
    if (data.advance) await advanceJobStatus(jobId, auth.user.id, "estimate");
    revalidateJob(jobId);
    return { ok: true };
  } catch (e) {
    logActionError("saveDesignAction", e);
    return { ok: false, error: errorMessage(e) };
  }
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
): Promise<ActionResult> {
  try {
    const auth = await requireJobsUser();
    if (!auth.ok) return auth;
    if (taxRatePct != null) {
      await updateJob(jobId, auth.user.id, { taxRatePct });
    }
    const rows = await replaceLineItems(jobId, auth.user.id, items);
    if (!rows) return { ok: false, error: "Could not save line items" };
    revalidateJob(jobId);
    return { ok: true };
  } catch (e) {
    logActionError("saveLineItemsAction", e);
    return { ok: false, error: errorMessage(e) };
  }
}

export async function generateQuotePdfAction(
  jobId: string,
): Promise<ActionResult<{ quote: QuoteRecord }>> {
  try {
    const auth = await requireJobsUser();
    if (!auth.ok) return auth;
    let quote = await createQuoteDraft(jobId, auth.user.id);
    if (!quote) return { ok: false, error: "Could not create quote" };
    const bundle = await getJobBundle(jobId, auth.user.id);
    if (!bundle) return { ok: false, error: "Job not found" };
    const pdf = await buildQuotePdf(bundle, quote.id);
    const stored = await storeJobFile({
      jobId,
      fileName: `quote-v${quote.version}.pdf`,
      mimeType: "application/pdf",
      bytes: pdf,
      folder: "quotes",
    });
    quote = await updateQuote(quote.id, auth.user.id, { pdfUrl: stored.url });
    if (!quote) return { ok: false, error: "Could not update quote PDF URL" };
    revalidateJob(jobId);
    return { ok: true, quote };
  } catch (e) {
    logActionError("generateQuotePdfAction", e);
    return { ok: false, error: errorMessage(e) };
  }
}

export async function sendQuoteAction(
  jobId: string,
  quoteId: string,
): Promise<ActionResult<{ stub?: boolean; acceptUrl: string }>> {
  try {
    const auth = await requireJobsUser();
    if (!auth.ok) return auth;
    const bundle = await getJobBundle(jobId, auth.user.id);
    if (!bundle) return { ok: false, error: "Job not found" };
    const quote = bundle.quotes.find((q) => q.id === quoteId);
    if (!quote) return { ok: false, error: "Quote not found" };
    if (!bundle.job.customerEmail) {
      return { ok: false, error: "Customer email required" };
    }

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
    if (!sent.ok) {
      return { ok: false, error: sent.error || "Email failed" };
    }
    await updateQuote(quoteId, auth.user.id, {
      status: "sent",
      sentAt: new Date().toISOString(),
    });
    revalidateJob(jobId);
    return { ok: true, stub: sent.stub, acceptUrl };
  } catch (e) {
    logActionError("sendQuoteAction", e);
    return { ok: false, error: errorMessage(e) };
  }
}

export async function acceptQuotePublicAction(
  token: string,
): Promise<ActionResult<{ jobId: string }>> {
  try {
    const bundle = await acceptQuoteByToken(token);
    if (!bundle) return { ok: false, error: "Quote not found" };
    revalidatePath(`/quote/${token}`);
    revalidateJob(bundle.job.id);
    return { ok: true, jobId: bundle.job.id };
  } catch (e) {
    logActionError("acceptQuotePublicAction", e);
    return { ok: false, error: errorMessage(e) };
  }
}

export async function setupInvoicesAction(
  jobId: string,
  mode: "full" | "deposit_balance",
): Promise<ActionResult<{ invoices: InvoiceRecord[] }>> {
  try {
    const auth = await requireJobsUser();
    if (!auth.ok) return auth;
    const invoices = await createInvoicesForJob(jobId, auth.user.id, mode);
    if (!invoices) return { ok: false, error: "Could not create invoices" };
    revalidateJob(jobId);
    return { ok: true, invoices };
  } catch (e) {
    logActionError("setupInvoicesAction", e);
    return { ok: false, error: errorMessage(e) };
  }
}
