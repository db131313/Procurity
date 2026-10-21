import { getPrisma } from "@/lib/db/prisma";
import { newId } from "./id";
import type {
  DesignSpecRecord,
  InvoiceRecord,
  JobBundle,
  JobRecord,
  JobStatus,
  LineItemCategory,
  LineItemRecord,
  MeasurementAnnotation,
  MeasurementRecord,
  MeasureUnit,
  PaymentRecord,
  QuoteRecord,
  ReferenceImage,
  ScanRecord,
  ScanType,
} from "./types";
import { computeTotals } from "./types";
import {
  decodeDataUrlPdf,
  invoicePdfPath,
  isDataUrlPdf,
  quotePdfPath,
  type PdfPayload,
} from "./pdf-urls";

/** Prisma Bytes expects Uint8Array backed by ArrayBuffer (not SharedArrayBuffer). */
function toPrismaBytes(bytes: Buffer): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

function mapJob(j: {
  id: string;
  ownerId: string;
  projectId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  siteAddress: string;
  status: JobStatus;
  taxRatePct: number;
  companyName: string;
  terms: string;
  createdAt: Date;
  updatedAt: Date;
}): JobRecord {
  return {
    id: j.id,
    ownerId: j.ownerId,
    projectId: j.projectId,
    customerName: j.customerName,
    customerEmail: j.customerEmail,
    customerPhone: j.customerPhone,
    siteAddress: j.siteAddress,
    status: j.status,
    taxRatePct: j.taxRatePct,
    companyName: j.companyName,
    terms: j.terms,
    createdAt: j.createdAt.toISOString(),
    updatedAt: j.updatedAt.toISOString(),
  };
}

async function loadBundle(jobId: string): Promise<JobBundle | null> {
  const prisma = getPrisma();
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      scans: { orderBy: { createdAt: "asc" } },
      measurements: { orderBy: { createdAt: "asc" } },
      designSpec: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      quotes: { orderBy: { version: "desc" } },
      invoices: { orderBy: { createdAt: "asc" }, include: { payments: true } },
    },
  });
  if (!job) return null;
  const payments: PaymentRecord[] = job.invoices.flatMap((inv) =>
    inv.payments.map((p) => ({
      id: p.id,
      invoiceId: p.invoiceId,
      amount: p.amount,
      status: p.status,
      stripePaymentIntentId: p.stripePaymentIntentId,
      createdAt: p.createdAt.toISOString(),
    })),
  );
  return {
    job: mapJob(job),
    scans: job.scans.map((s) => ({
      id: s.id,
      jobId: s.jobId,
      fileUrl: s.fileUrl,
      fileName: s.fileName,
      mimeType: s.mimeType,
      type: s.type,
      createdAt: s.createdAt.toISOString(),
    })),
    measurements: job.measurements.map((m) => ({
      id: m.id,
      jobId: m.jobId,
      label: m.label,
      width: m.width,
      height: m.height,
      unit: m.unit,
      annotation: (m.annotation as MeasurementAnnotation | null) ?? null,
      createdAt: m.createdAt.toISOString(),
    })),
    designSpec: job.designSpec
      ? {
          id: job.designSpec.id,
          jobId: job.designSpec.jobId,
          signType: job.designSpec.signType,
          description: job.designSpec.description,
          notes: job.designSpec.notes,
          referenceImages: (job.designSpec.referenceImages as ReferenceImage[]) ?? [],
          updatedAt: job.designSpec.updatedAt.toISOString(),
        }
      : null,
    lineItems: job.lineItems.map((l) => ({
      id: l.id,
      jobId: l.jobId,
      category: l.category,
      description: l.description,
      qty: l.qty,
      unitCost: l.unitCost,
      markupPct: l.markupPct,
      catalogKey: l.catalogKey,
      sortOrder: l.sortOrder,
      createdAt: l.createdAt.toISOString(),
    })),
    quotes: job.quotes.map((q) => {
      const hasPdf = Boolean(q.pdfData?.length || q.pdfUrl);
      return {
        id: q.id,
        jobId: q.jobId,
        version: q.version,
        subtotal: q.subtotal,
        tax: q.tax,
        total: q.total,
        // Never expose data: URLs to the client — always the API route path.
        pdfUrl: hasPdf ? quotePdfPath(q.jobId, q.id) : null,
        status: q.status,
        acceptToken: q.acceptToken,
        validUntil: q.validUntil?.toISOString() ?? null,
        sentAt: q.sentAt?.toISOString() ?? null,
        acceptedAt: q.acceptedAt?.toISOString() ?? null,
        createdAt: q.createdAt.toISOString(),
        updatedAt: q.updatedAt.toISOString(),
      };
    }),
    invoices: job.invoices.map((i) => {
      const hasPdf = Boolean(i.pdfData?.length || i.pdfUrl);
      return {
        id: i.id,
        jobId: i.jobId,
        type: i.type,
        amount: i.amount,
        status: i.status,
        stripeCheckoutSessionId: i.stripeCheckoutSessionId,
        pdfUrl: hasPdf ? invoicePdfPath(i.jobId, i.id) : null,
        unlockAfterId: i.unlockAfterId,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
      };
    }),
    payments,
  };
}

export async function listJobsForOwner(ownerId: string): Promise<JobRecord[]> {
  const prisma = getPrisma();
  const rows = await prisma.job.findMany({
    where: { ownerId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(mapJob);
}

export async function getJobBundle(jobId: string, ownerId?: string) {
  const bundle = await loadBundle(jobId);
  if (!bundle) return null;
  if (ownerId && bundle.job.ownerId !== ownerId) return null;
  return bundle;
}

export async function getJobByQuoteToken(token: string) {
  const prisma = getPrisma();
  const quote = await prisma.quote.findUnique({ where: { acceptToken: token } });
  if (!quote) return null;
  return loadBundle(quote.jobId);
}

export async function createJob(input: {
  ownerId: string;
  projectId?: string | null;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  siteAddress?: string;
}): Promise<JobRecord> {
  const prisma = getPrisma();
  const row = await prisma.job.create({
    data: {
      ownerId: input.ownerId,
      projectId: input.projectId ?? null,
      customerName: input.customerName ?? "",
      customerEmail: input.customerEmail ?? "",
      customerPhone: input.customerPhone ?? "",
      siteAddress: input.siteAddress ?? "",
    },
  });
  return mapJob(row);
}

export async function updateJob(
  jobId: string,
  ownerId: string,
  patch: Partial<{
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    siteAddress: string;
    projectId: string | null;
    status: JobStatus;
    taxRatePct: number;
    companyName: string;
    terms: string;
  }>,
) {
  const prisma = getPrisma();
  const existing = await prisma.job.findFirst({ where: { id: jobId, ownerId } });
  if (!existing) return null;
  const row = await prisma.job.update({ where: { id: jobId }, data: patch });
  return mapJob(row);
}

export async function addScan(
  jobId: string,
  ownerId: string,
  data: { fileUrl: string; fileName: string; mimeType: string; type: ScanType },
) {
  const prisma = getPrisma();
  const job = await prisma.job.findFirst({ where: { id: jobId, ownerId } });
  if (!job) return null;
  const s = await prisma.scan.create({ data: { jobId, ...data } });
  await prisma.job.update({ where: { id: jobId }, data: { updatedAt: new Date() } });
  return {
    id: s.id,
    jobId: s.jobId,
    fileUrl: s.fileUrl,
    fileName: s.fileName,
    mimeType: s.mimeType,
    type: s.type,
    createdAt: s.createdAt.toISOString(),
  } satisfies ScanRecord;
}

export async function addMeasurement(
  jobId: string,
  ownerId: string,
  data: {
    label: string;
    width?: number | null;
    height?: number | null;
    unit?: MeasureUnit;
    annotation?: MeasurementAnnotation | null;
  },
) {
  const prisma = getPrisma();
  const job = await prisma.job.findFirst({ where: { id: jobId, ownerId } });
  if (!job) return null;
  const m = await prisma.measurement.create({
    data: {
      jobId,
      label: data.label,
      width: data.width ?? null,
      height: data.height ?? null,
      unit: data.unit ?? "in",
      annotation: data.annotation ?? undefined,
    },
  });
  await prisma.job.update({ where: { id: jobId }, data: { updatedAt: new Date() } });
  return {
    id: m.id,
    jobId: m.jobId,
    label: m.label,
    width: m.width,
    height: m.height,
    unit: m.unit,
    annotation: (m.annotation as MeasurementAnnotation | null) ?? null,
    createdAt: m.createdAt.toISOString(),
  } satisfies MeasurementRecord;
}

export async function deleteMeasurement(measurementId: string, ownerId: string) {
  const prisma = getPrisma();
  const m = await prisma.measurement.findUnique({ where: { id: measurementId } });
  if (!m) return false;
  const job = await prisma.job.findFirst({ where: { id: m.jobId, ownerId } });
  if (!job) return false;
  await prisma.measurement.delete({ where: { id: measurementId } });
  return true;
}

export async function upsertDesignSpec(
  jobId: string,
  ownerId: string,
  data: {
    signType?: string;
    description?: string;
    notes?: string;
    referenceImages?: ReferenceImage[];
  },
) {
  const prisma = getPrisma();
  const job = await prisma.job.findFirst({ where: { id: jobId, ownerId } });
  if (!job) return null;
  const row = await prisma.designSpec.upsert({
    where: { jobId },
    create: {
      jobId,
      signType: data.signType ?? "",
      description: data.description ?? "",
      notes: data.notes ?? "",
      referenceImages: data.referenceImages ?? [],
    },
    update: {
      ...(data.signType !== undefined ? { signType: data.signType } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.referenceImages !== undefined
        ? { referenceImages: data.referenceImages }
        : {}),
    },
  });
  return {
    id: row.id,
    jobId: row.jobId,
    signType: row.signType,
    description: row.description,
    notes: row.notes,
    referenceImages: (row.referenceImages as ReferenceImage[]) ?? [],
    updatedAt: row.updatedAt.toISOString(),
  } satisfies DesignSpecRecord;
}

export async function replaceLineItems(
  jobId: string,
  ownerId: string,
  items: Array<{
    id?: string;
    category: LineItemCategory;
    description: string;
    qty: number;
    unitCost: number;
    markupPct: number;
    catalogKey?: string | null;
  }>,
) {
  const prisma = getPrisma();
  const job = await prisma.job.findFirst({ where: { id: jobId, ownerId } });
  if (!job) return null;
  await prisma.lineItem.deleteMany({ where: { jobId } });
  const created = await Promise.all(
    items.map((item, idx) =>
      prisma.lineItem.create({
        data: {
          id: item.id || undefined,
          jobId,
          category: item.category,
          description: item.description,
          qty: item.qty,
          unitCost: item.unitCost,
          markupPct: item.markupPct,
          catalogKey: item.catalogKey ?? null,
          sortOrder: idx,
        },
      }),
    ),
  );
  return created.map(
    (l): LineItemRecord => ({
      id: l.id,
      jobId: l.jobId,
      category: l.category,
      description: l.description,
      qty: l.qty,
      unitCost: l.unitCost,
      markupPct: l.markupPct,
      catalogKey: l.catalogKey,
      sortOrder: l.sortOrder,
      createdAt: l.createdAt.toISOString(),
    }),
  );
}

export async function createQuoteDraft(jobId: string, ownerId: string) {
  const bundle = await getJobBundle(jobId, ownerId);
  if (!bundle) return null;
  const prisma = getPrisma();
  const max = await prisma.quote.aggregate({
    where: { jobId },
    _max: { version: true },
  });
  const version = (max._max.version ?? 0) + 1;
  const totals = computeTotals(bundle.lineItems, bundle.job.taxRatePct);
  const q = await prisma.quote.create({
    data: {
      jobId,
      version,
      ...totals,
      acceptToken: newId("tok"),
      validUntil: new Date(Date.now() + 30 * 86400000),
      status: "draft",
    },
  });
  return {
    id: q.id,
    jobId: q.jobId,
    version: q.version,
    subtotal: q.subtotal,
    tax: q.tax,
    total: q.total,
    pdfUrl: q.pdfUrl,
    status: q.status,
    acceptToken: q.acceptToken,
    validUntil: q.validUntil?.toISOString() ?? null,
    sentAt: q.sentAt?.toISOString() ?? null,
    acceptedAt: q.acceptedAt?.toISOString() ?? null,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  } satisfies QuoteRecord;
}

export async function updateQuote(
  quoteId: string,
  ownerId: string,
  patch: Partial<{
    pdfUrl: string | null;
    status: QuoteRecord["status"];
    sentAt: string | null;
    acceptedAt: string | null;
    subtotal: number;
    tax: number;
    total: number;
  }>,
) {
  const prisma = getPrisma();
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) return null;
  const job = await prisma.job.findFirst({
    where: { id: quote.jobId, ownerId },
  });
  if (!job) return null;
  const safePdfUrl =
    patch.pdfUrl !== undefined && isDataUrlPdf(patch.pdfUrl)
      ? quotePdfPath(quote.jobId, quoteId)
      : patch.pdfUrl;
  const q = await prisma.quote.update({
    where: { id: quoteId },
    data: {
      ...(safePdfUrl !== undefined ? { pdfUrl: safePdfUrl } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.sentAt !== undefined
        ? { sentAt: patch.sentAt ? new Date(patch.sentAt) : null }
        : {}),
      ...(patch.acceptedAt !== undefined
        ? { acceptedAt: patch.acceptedAt ? new Date(patch.acceptedAt) : null }
        : {}),
      ...(patch.subtotal !== undefined ? { subtotal: patch.subtotal } : {}),
      ...(patch.tax !== undefined ? { tax: patch.tax } : {}),
      ...(patch.total !== undefined ? { total: patch.total } : {}),
    },
  });
  const hasPdf = Boolean(q.pdfData?.length || q.pdfUrl);
  return {
    id: q.id,
    jobId: q.jobId,
    version: q.version,
    subtotal: q.subtotal,
    tax: q.tax,
    total: q.total,
    pdfUrl: hasPdf ? quotePdfPath(q.jobId, q.id) : null,
    status: q.status,
    acceptToken: q.acceptToken,
    validUntil: q.validUntil?.toISOString() ?? null,
    sentAt: q.sentAt?.toISOString() ?? null,
    acceptedAt: q.acceptedAt?.toISOString() ?? null,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  } satisfies QuoteRecord;
}

export async function saveQuotePdf(
  quoteId: string,
  ownerId: string,
  bytes: Buffer,
): Promise<QuoteRecord | null> {
  const prisma = getPrisma();
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) return null;
  const job = await prisma.job.findFirst({
    where: { id: quote.jobId, ownerId },
  });
  if (!job) return null;
  const path = quotePdfPath(quote.jobId, quoteId);
  const q = await prisma.quote.update({
    where: { id: quoteId },
    data: { pdfData: toPrismaBytes(bytes), pdfUrl: path },
  });
  return {
    id: q.id,
    jobId: q.jobId,
    version: q.version,
    subtotal: q.subtotal,
    tax: q.tax,
    total: q.total,
    pdfUrl: path,
    status: q.status,
    acceptToken: q.acceptToken,
    validUntil: q.validUntil?.toISOString() ?? null,
    sentAt: q.sentAt?.toISOString() ?? null,
    acceptedAt: q.acceptedAt?.toISOString() ?? null,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  } satisfies QuoteRecord;
}

function bytesFromQuoteRow(q: {
  pdfData: Uint8Array | Buffer | null;
  pdfUrl: string | null;
}): Buffer | null {
  if (q.pdfData && q.pdfData.length) return Buffer.from(q.pdfData);
  if (isDataUrlPdf(q.pdfUrl)) return decodeDataUrlPdf(q.pdfUrl!);
  return null;
}

export async function getQuotePdfPayload(
  jobId: string,
  quoteId: string,
  ownerId?: string,
): Promise<PdfPayload | null> {
  const prisma = getPrisma();
  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, jobId },
  });
  if (!quote) return null;
  if (ownerId) {
    const job = await prisma.job.findFirst({ where: { id: jobId, ownerId } });
    if (!job) return null;
  }
  const bytes = bytesFromQuoteRow(quote);
  if (!bytes) return null;
  // Lazy-migrate legacy data: URLs into pdfData + route pdfUrl
  if (!quote.pdfData?.length || isDataUrlPdf(quote.pdfUrl)) {
    await prisma.quote.update({
      where: { id: quoteId },
      data: {
        pdfData: toPrismaBytes(bytes),
        pdfUrl: quotePdfPath(jobId, quoteId),
      },
    });
  }
  return {
    bytes,
    fileName: `quote-v${quote.version}.pdf`,
    version: quote.version,
  };
}

export async function getQuotePdfPayloadByToken(
  token: string,
): Promise<PdfPayload | null> {
  const prisma = getPrisma();
  const quote = await prisma.quote.findUnique({ where: { acceptToken: token } });
  if (!quote) return null;
  const bytes = bytesFromQuoteRow(quote);
  if (!bytes) return null;
  if (!quote.pdfData?.length || isDataUrlPdf(quote.pdfUrl)) {
    await prisma.quote.update({
      where: { id: quote.id },
      data: {
        pdfData: toPrismaBytes(bytes),
        pdfUrl: quotePdfPath(quote.jobId, quote.id),
      },
    });
  }
  return {
    bytes,
    fileName: `quote-v${quote.version}.pdf`,
    version: quote.version,
  };
}

export async function saveInvoicePdf(
  invoiceId: string,
  ownerId: string,
  bytes: Buffer,
): Promise<InvoiceRecord | null> {
  const prisma = getPrisma();
  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!inv) return null;
  const job = await prisma.job.findFirst({
    where: { id: inv.jobId, ownerId },
  });
  if (!job) return null;
  const path = invoicePdfPath(inv.jobId, invoiceId);
  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { pdfData: toPrismaBytes(bytes), pdfUrl: path },
  });
  return {
    id: updated.id,
    jobId: updated.jobId,
    type: updated.type,
    amount: updated.amount,
    status: updated.status,
    stripeCheckoutSessionId: updated.stripeCheckoutSessionId,
    pdfUrl: path,
    unlockAfterId: updated.unlockAfterId,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  } satisfies InvoiceRecord;
}

export async function getInvoicePdfPayload(
  jobId: string,
  invoiceId: string,
  ownerId?: string,
): Promise<PdfPayload | null> {
  const prisma = getPrisma();
  const inv = await prisma.invoice.findFirst({
    where: { id: invoiceId, jobId },
  });
  if (!inv) return null;
  if (ownerId) {
    const job = await prisma.job.findFirst({ where: { id: jobId, ownerId } });
    if (!job) return null;
  }
  const bytes = inv.pdfData?.length
    ? Buffer.from(inv.pdfData)
    : isDataUrlPdf(inv.pdfUrl)
      ? decodeDataUrlPdf(inv.pdfUrl!)
      : null;
  if (!bytes) return null;
  if (!inv.pdfData?.length || isDataUrlPdf(inv.pdfUrl)) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        pdfData: toPrismaBytes(bytes),
        pdfUrl: invoicePdfPath(jobId, invoiceId),
      },
    });
  }
  return {
    bytes,
    fileName: `invoice-${inv.type}.pdf`,
  };
}

export async function acceptQuoteByToken(token: string) {
  const prisma = getPrisma();
  const quote = await prisma.quote.findUnique({ where: { acceptToken: token } });
  if (!quote) return null;
  if (quote.status !== "accepted") {
    await prisma.quote.update({
      where: { id: quote.id },
      data: { status: "accepted", acceptedAt: new Date() },
    });
    await prisma.job.update({
      where: { id: quote.jobId },
      data: { status: "invoice" },
    });
  }
  return loadBundle(quote.jobId);
}

export async function createInvoicesForJob(
  jobId: string,
  ownerId: string,
  mode: "full" | "deposit_balance",
) {
  const bundle = await getJobBundle(jobId, ownerId);
  if (!bundle) return null;
  const accepted =
    bundle.quotes.find((q) => q.status === "accepted") || bundle.quotes[0];
  if (!accepted) return null;
  const prisma = getPrisma();
  await prisma.invoice.deleteMany({
    where: { jobId, status: { not: "paid" } },
  });
  const created: InvoiceRecord[] = [];
  if (mode === "full") {
    const inv = await prisma.invoice.create({
      data: {
        jobId,
        type: "full",
        amount: accepted.total,
        status: "open",
      },
    });
    created.push({
      id: inv.id,
      jobId: inv.jobId,
      type: inv.type,
      amount: inv.amount,
      status: inv.status,
      stripeCheckoutSessionId: inv.stripeCheckoutSessionId,
      pdfUrl: inv.pdfUrl,
      unlockAfterId: inv.unlockAfterId,
      createdAt: inv.createdAt.toISOString(),
      updatedAt: inv.updatedAt.toISOString(),
    });
  } else {
    const depositAmt = Math.round(accepted.total * 50) / 100;
    const balanceAmt = Math.round((accepted.total - depositAmt) * 100) / 100;
    const deposit = await prisma.invoice.create({
      data: {
        jobId,
        type: "deposit",
        amount: depositAmt,
        status: "open",
      },
    });
    const balance = await prisma.invoice.create({
      data: {
        jobId,
        type: "balance",
        amount: balanceAmt,
        status: "draft",
        unlockAfterId: deposit.id,
      },
    });
    for (const inv of [deposit, balance]) {
      created.push({
        id: inv.id,
        jobId: inv.jobId,
        type: inv.type,
        amount: inv.amount,
        status: inv.status,
        stripeCheckoutSessionId: inv.stripeCheckoutSessionId,
        pdfUrl: inv.pdfUrl,
        unlockAfterId: inv.unlockAfterId,
        createdAt: inv.createdAt.toISOString(),
        updatedAt: inv.updatedAt.toISOString(),
      });
    }
  }
  await prisma.job.update({ where: { id: jobId }, data: { status: "invoice" } });
  return created;
}

export async function setInvoiceCheckout(
  invoiceId: string,
  ownerId: string,
  sessionId: string,
  pdfUrl?: string | null,
) {
  const prisma = getPrisma();
  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!inv) return null;
  const job = await prisma.job.findFirst({
    where: { id: inv.jobId, ownerId },
  });
  if (!job) return null;
  const safePdfUrl =
    pdfUrl !== undefined && isDataUrlPdf(pdfUrl)
      ? invoicePdfPath(inv.jobId, invoiceId)
      : pdfUrl;
  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      stripeCheckoutSessionId: sessionId,
      ...(safePdfUrl !== undefined ? { pdfUrl: safePdfUrl } : {}),
      status: inv.status === "draft" ? "open" : inv.status,
    },
  });
  const hasPdf = Boolean(updated.pdfData?.length || updated.pdfUrl);
  return {
    id: updated.id,
    jobId: updated.jobId,
    type: updated.type,
    amount: updated.amount,
    status: updated.status,
    stripeCheckoutSessionId: updated.stripeCheckoutSessionId,
    pdfUrl: hasPdf ? invoicePdfPath(updated.jobId, updated.id) : null,
    unlockAfterId: updated.unlockAfterId,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  } satisfies InvoiceRecord;
}

export async function markInvoicePaidBySession(
  sessionId: string,
  paymentIntentId?: string | null,
) {
  const prisma = getPrisma();
  const inv = await prisma.invoice.findFirst({
    where: { stripeCheckoutSessionId: sessionId },
  });
  if (!inv) return null;
  if (inv.status === "paid") {
    return {
      id: inv.id,
      jobId: inv.jobId,
      type: inv.type,
      amount: inv.amount,
      status: inv.status,
      stripeCheckoutSessionId: inv.stripeCheckoutSessionId,
      pdfUrl: inv.pdfUrl,
      unlockAfterId: inv.unlockAfterId,
      createdAt: inv.createdAt.toISOString(),
      updatedAt: inv.updatedAt.toISOString(),
    } satisfies InvoiceRecord;
  }
  const updated = await prisma.invoice.update({
    where: { id: inv.id },
    data: { status: "paid" },
  });
  await prisma.payment.create({
    data: {
      invoiceId: inv.id,
      amount: inv.amount,
      status: "succeeded",
      stripePaymentIntentId: paymentIntentId ?? null,
    },
  });
  await prisma.invoice.updateMany({
    where: { unlockAfterId: inv.id, status: "draft" },
    data: { status: "open" },
  });
  const remaining = await prisma.invoice.count({
    where: { jobId: inv.jobId, status: { not: "paid" } },
  });
  if (remaining === 0) {
    await prisma.job.update({
      where: { id: inv.jobId },
      data: { status: "completed" },
    });
  }
  return {
    id: updated.id,
    jobId: updated.jobId,
    type: updated.type,
    amount: updated.amount,
    status: updated.status,
    stripeCheckoutSessionId: updated.stripeCheckoutSessionId,
    pdfUrl: updated.pdfUrl,
    unlockAfterId: updated.unlockAfterId,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  } satisfies InvoiceRecord;
}

export async function advanceJobStatus(
  jobId: string,
  ownerId: string,
  status: JobStatus,
) {
  return updateJob(jobId, ownerId, { status });
}
