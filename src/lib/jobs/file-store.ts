import { promises as fs } from "fs";
import path from "path";
import { newId } from "./id";
import type {
  DesignSpecRecord,
  InvoiceRecord,
  InvoiceType,
  JobBundle,
  JobRecord,
  JobStatus,
  LineItemRecord,
  MeasurementAnnotation,
  MeasurementRecord,
  MeasureUnit,
  PaymentRecord,
  QuoteRecord,
  ReferenceImage,
  ScanRecord,
  ScanType,
  LineItemCategory,
} from "./types";
import { computeTotals } from "./types";
import {
  decodeDataUrlPdf,
  invoicePdfPath,
  isDataUrlPdf,
  quotePdfPath,
  type PdfPayload,
} from "./pdf-urls";

/** Server-only PDF bytes (base64) — never sent to client components. */
type StoredQuote = QuoteRecord & { pdfBase64?: string | null };
type StoredInvoice = InvoiceRecord & { pdfBase64?: string | null };

type JobsDb = {
  jobs: JobRecord[];
  scans: ScanRecord[];
  measurements: MeasurementRecord[];
  designSpecs: DesignSpecRecord[];
  lineItems: LineItemRecord[];
  quotes: StoredQuote[];
  invoices: StoredInvoice[];
  payments: PaymentRecord[];
};

function publicQuote(q: StoredQuote): QuoteRecord {
  const { pdfBase64: _b, ...rest } = q;
  const hasPdf = Boolean(pdfBase64Bytes(q) || q.pdfUrl);
  return {
    ...rest,
    pdfUrl: hasPdf ? quotePdfPath(q.jobId, q.id) : null,
  };
}

function publicInvoice(i: StoredInvoice): InvoiceRecord {
  const { pdfBase64: _b, ...rest } = i;
  const hasPdf = Boolean(pdfBase64Bytes(i) || i.pdfUrl);
  return {
    ...rest,
    pdfUrl: hasPdf ? invoicePdfPath(i.jobId, i.id) : null,
  };
}

function pdfBase64Bytes(
  row: { pdfBase64?: string | null; pdfUrl?: string | null },
): Buffer | null {
  if (row.pdfBase64) {
    try {
      return Buffer.from(row.pdfBase64, "base64");
    } catch {
      return null;
    }
  }
  if (isDataUrlPdf(row.pdfUrl)) return decodeDataUrlPdf(row.pdfUrl!);
  return null;
}

const DATA_PATH = path.join(process.cwd(), "data", "jobs-store.json");

async function load(): Promise<JobsDb> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    return JSON.parse(raw) as JobsDb;
  } catch {
    const empty: JobsDb = {
      jobs: [],
      scans: [],
      measurements: [],
      designSpecs: [],
      lineItems: [],
      quotes: [],
      invoices: [],
      payments: [],
    };
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(empty, null, 2));
    return empty;
  }
}

async function save(db: JobsDb) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(db, null, 2));
}

function now() {
  return new Date().toISOString();
}

function assemble(db: JobsDb, job: JobRecord): JobBundle {
  const invoices = db.invoices
    .filter((i) => i.jobId === job.id)
    .map(publicInvoice);
  const invoiceIds = new Set(invoices.map((i) => i.id));
  return {
    job,
    scans: db.scans.filter((s) => s.jobId === job.id),
    measurements: db.measurements.filter((m) => m.jobId === job.id),
    designSpec: db.designSpecs.find((d) => d.jobId === job.id) ?? null,
    lineItems: db.lineItems
      .filter((l) => l.jobId === job.id)
      .sort((a, b) => a.sortOrder - b.sortOrder),
    quotes: db.quotes
      .filter((q) => q.jobId === job.id)
      .sort((a, b) => b.version - a.version)
      .map(publicQuote),
    invoices,
    payments: db.payments.filter((p) => invoiceIds.has(p.invoiceId)),
  };
}

export async function listJobsForOwner(ownerId: string): Promise<JobRecord[]> {
  const db = await load();
  return db.jobs
    .filter((j) => j.ownerId === ownerId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getJobBundle(
  jobId: string,
  ownerId?: string,
): Promise<JobBundle | null> {
  const db = await load();
  const job = db.jobs.find((j) => j.id === jobId);
  if (!job) return null;
  if (ownerId && job.ownerId !== ownerId) return null;
  return assemble(db, job);
}

export async function getJobByQuoteToken(token: string): Promise<JobBundle | null> {
  const db = await load();
  const quote = db.quotes.find((q) => q.acceptToken === token);
  if (!quote) return null;
  const job = db.jobs.find((j) => j.id === quote.jobId);
  if (!job) return null;
  return assemble(db, job);
}

export async function createJob(input: {
  ownerId: string;
  projectId?: string | null;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  siteAddress?: string;
}): Promise<JobRecord> {
  const db = await load();
  const ts = now();
  const job: JobRecord = {
    id: newId("job"),
    ownerId: input.ownerId,
    projectId: input.projectId ?? null,
    customerName: input.customerName ?? "",
    customerEmail: input.customerEmail ?? "",
    customerPhone: input.customerPhone ?? "",
    siteAddress: input.siteAddress ?? "",
    status: "start",
    taxRatePct: 8.875,
    companyName: "Procurity Signs",
    terms:
      "Quote valid for 30 days. 50% deposit due on acceptance unless otherwise agreed.",
    createdAt: ts,
    updatedAt: ts,
  };
  db.jobs.push(job);
  await save(db);
  return job;
}

export async function updateJob(
  jobId: string,
  ownerId: string,
  patch: Partial<
    Pick<
      JobRecord,
      | "customerName"
      | "customerEmail"
      | "customerPhone"
      | "siteAddress"
      | "projectId"
      | "status"
      | "taxRatePct"
      | "companyName"
      | "terms"
    >
  >,
): Promise<JobRecord | null> {
  const db = await load();
  const job = db.jobs.find((j) => j.id === jobId && j.ownerId === ownerId);
  if (!job) return null;
  Object.assign(job, patch, { updatedAt: now() });
  await save(db);
  return job;
}

export async function addScan(
  jobId: string,
  ownerId: string,
  data: {
    fileUrl: string;
    fileName: string;
    mimeType: string;
    type: ScanType;
  },
): Promise<ScanRecord | null> {
  const db = await load();
  const job = db.jobs.find((j) => j.id === jobId && j.ownerId === ownerId);
  if (!job) return null;
  const scan: ScanRecord = {
    id: newId("scan"),
    jobId,
    ...data,
    createdAt: now(),
  };
  db.scans.push(scan);
  job.updatedAt = now();
  await save(db);
  return scan;
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
): Promise<MeasurementRecord | null> {
  const db = await load();
  const job = db.jobs.find((j) => j.id === jobId && j.ownerId === ownerId);
  if (!job) return null;
  const row: MeasurementRecord = {
    id: newId("meas"),
    jobId,
    label: data.label,
    width: data.width ?? null,
    height: data.height ?? null,
    unit: data.unit ?? "in",
    annotation: data.annotation ?? null,
    createdAt: now(),
  };
  db.measurements.push(row);
  job.updatedAt = now();
  await save(db);
  return row;
}

export async function deleteMeasurement(
  measurementId: string,
  ownerId: string,
): Promise<boolean> {
  const db = await load();
  const row = db.measurements.find((m) => m.id === measurementId);
  if (!row) return false;
  const job = db.jobs.find((j) => j.id === row.jobId && j.ownerId === ownerId);
  if (!job) return false;
  db.measurements = db.measurements.filter((m) => m.id !== measurementId);
  job.updatedAt = now();
  await save(db);
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
): Promise<DesignSpecRecord | null> {
  const db = await load();
  const job = db.jobs.find((j) => j.id === jobId && j.ownerId === ownerId);
  if (!job) return null;
  let spec = db.designSpecs.find((d) => d.jobId === jobId);
  const ts = now();
  if (!spec) {
    spec = {
      id: newId("design"),
      jobId,
      signType: data.signType ?? "",
      description: data.description ?? "",
      notes: data.notes ?? "",
      referenceImages: data.referenceImages ?? [],
      updatedAt: ts,
    };
    db.designSpecs.push(spec);
  } else {
    if (data.signType !== undefined) spec.signType = data.signType;
    if (data.description !== undefined) spec.description = data.description;
    if (data.notes !== undefined) spec.notes = data.notes;
    if (data.referenceImages !== undefined)
      spec.referenceImages = data.referenceImages;
    spec.updatedAt = ts;
  }
  job.updatedAt = ts;
  await save(db);
  return spec;
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
): Promise<LineItemRecord[] | null> {
  const db = await load();
  const job = db.jobs.find((j) => j.id === jobId && j.ownerId === ownerId);
  if (!job) return null;
  db.lineItems = db.lineItems.filter((l) => l.jobId !== jobId);
  const ts = now();
  const created = items.map((item, idx) => {
    const row: LineItemRecord = {
      id: item.id || newId("li"),
      jobId,
      category: item.category,
      description: item.description,
      qty: item.qty,
      unitCost: item.unitCost,
      markupPct: item.markupPct,
      catalogKey: item.catalogKey ?? null,
      sortOrder: idx,
      createdAt: ts,
    };
    db.lineItems.push(row);
    return row;
  });
  job.updatedAt = ts;
  await save(db);
  return created;
}

export async function createQuoteDraft(
  jobId: string,
  ownerId: string,
): Promise<QuoteRecord | null> {
  const bundle = await getJobBundle(jobId, ownerId);
  if (!bundle) return null;
  const db = await load();
  const job = db.jobs.find((j) => j.id === jobId)!;
  const version =
    Math.max(0, ...db.quotes.filter((q) => q.jobId === jobId).map((q) => q.version)) +
    1;
  const totals = computeTotals(bundle.lineItems, job.taxRatePct);
  const ts = now();
  const validUntil = new Date(Date.now() + 30 * 86400000).toISOString();
  const quote: QuoteRecord = {
    id: newId("quote"),
    jobId,
    version,
    ...totals,
    pdfUrl: null,
    status: "draft",
    acceptToken: newId("tok"),
    validUntil,
    sentAt: null,
    acceptedAt: null,
    createdAt: ts,
    updatedAt: ts,
  };
  db.quotes.push(quote);
  job.updatedAt = ts;
  await save(db);
  return quote;
}

export async function updateQuote(
  quoteId: string,
  ownerId: string,
  patch: Partial<
    Pick<QuoteRecord, "pdfUrl" | "status" | "sentAt" | "acceptedAt" | "subtotal" | "tax" | "total">
  > & { pdfBase64?: string | null },
): Promise<QuoteRecord | null> {
  const db = await load();
  const quote = db.quotes.find((q) => q.id === quoteId);
  if (!quote) return null;
  const job = db.jobs.find((j) => j.id === quote.jobId && j.ownerId === ownerId);
  if (!job) return null;
  const { pdfBase64, ...rest } = patch;
  Object.assign(quote, rest, { updatedAt: now() });
  if (pdfBase64 !== undefined) quote.pdfBase64 = pdfBase64;
  job.updatedAt = now();
  await save(db);
  return publicQuote(quote);
}

/** Persist quote PDF bytes in the JSON store and set pdfUrl to the API route. */
export async function saveQuotePdf(
  quoteId: string,
  ownerId: string,
  bytes: Buffer,
): Promise<QuoteRecord | null> {
  const db = await load();
  const quote = db.quotes.find((q) => q.id === quoteId);
  if (!quote) return null;
  const job = db.jobs.find((j) => j.id === quote.jobId && j.ownerId === ownerId);
  if (!job) return null;
  quote.pdfBase64 = bytes.toString("base64");
  quote.pdfUrl = quotePdfPath(quote.jobId, quote.id);
  quote.updatedAt = now();
  job.updatedAt = now();
  await save(db);
  return publicQuote(quote);
}

export async function getQuotePdfPayload(
  jobId: string,
  quoteId: string,
  ownerId?: string,
): Promise<PdfPayload | null> {
  const db = await load();
  const quote = db.quotes.find((q) => q.id === quoteId && q.jobId === jobId);
  if (!quote) return null;
  const job = db.jobs.find((j) => j.id === jobId);
  if (!job) return null;
  if (ownerId && job.ownerId !== ownerId) return null;
  const bytes = pdfBase64Bytes(quote);
  if (!bytes) return null;
  // Lazy-migrate legacy data: URLs into pdfBase64 + route pdfUrl
  if (!quote.pdfBase64 || isDataUrlPdf(quote.pdfUrl)) {
    quote.pdfBase64 = bytes.toString("base64");
    quote.pdfUrl = quotePdfPath(jobId, quoteId);
    quote.updatedAt = now();
    await save(db);
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
  const db = await load();
  const quote = db.quotes.find((q) => q.acceptToken === token);
  if (!quote) return null;
  const bytes = pdfBase64Bytes(quote);
  if (!bytes) return null;
  if (!quote.pdfBase64 || isDataUrlPdf(quote.pdfUrl)) {
    quote.pdfBase64 = bytes.toString("base64");
    quote.pdfUrl = quotePdfPath(quote.jobId, quote.id);
    quote.updatedAt = now();
    await save(db);
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
  const db = await load();
  const inv = db.invoices.find((i) => i.id === invoiceId);
  if (!inv) return null;
  const job = db.jobs.find((j) => j.id === inv.jobId && j.ownerId === ownerId);
  if (!job) return null;
  inv.pdfBase64 = bytes.toString("base64");
  inv.pdfUrl = invoicePdfPath(inv.jobId, inv.id);
  inv.updatedAt = now();
  job.updatedAt = now();
  await save(db);
  return publicInvoice(inv);
}

export async function getInvoicePdfPayload(
  jobId: string,
  invoiceId: string,
  ownerId?: string,
): Promise<PdfPayload | null> {
  const db = await load();
  const inv = db.invoices.find((i) => i.id === invoiceId && i.jobId === jobId);
  if (!inv) return null;
  const job = db.jobs.find((j) => j.id === jobId);
  if (!job) return null;
  if (ownerId && job.ownerId !== ownerId) return null;
  const bytes = pdfBase64Bytes(inv);
  if (!bytes) return null;
  if (!inv.pdfBase64 || isDataUrlPdf(inv.pdfUrl)) {
    inv.pdfBase64 = bytes.toString("base64");
    inv.pdfUrl = invoicePdfPath(jobId, invoiceId);
    inv.updatedAt = now();
    await save(db);
  }
  return {
    bytes,
    fileName: `invoice-${inv.type}.pdf`,
  };
}

export async function acceptQuoteByToken(token: string): Promise<JobBundle | null> {
  const db = await load();
  const quote = db.quotes.find((q) => q.acceptToken === token);
  if (!quote) return null;
  if (quote.status === "accepted") {
    const job = db.jobs.find((j) => j.id === quote.jobId)!;
    return assemble(db, job);
  }
  quote.status = "accepted";
  quote.acceptedAt = now();
  quote.updatedAt = now();
  const job = db.jobs.find((j) => j.id === quote.jobId)!;
  job.status = "invoice";
  job.updatedAt = now();
  await save(db);
  return assemble(db, job);
}

export async function createInvoicesForJob(
  jobId: string,
  ownerId: string,
  mode: "full" | "deposit_balance",
): Promise<InvoiceRecord[] | null> {
  const bundle = await getJobBundle(jobId, ownerId);
  if (!bundle) return null;
  const accepted =
    bundle.quotes.find((q) => q.status === "accepted") || bundle.quotes[0];
  if (!accepted) return null;
  const db = await load();
  const job = db.jobs.find((j) => j.id === jobId && j.ownerId === ownerId)!;
  // Clear prior unpaid drafts
  const keepPaid = db.invoices.filter(
    (i) => i.jobId === jobId && i.status === "paid",
  );
  db.invoices = db.invoices.filter(
    (i) => i.jobId !== jobId || i.status === "paid",
  );
  const ts = now();
  const created: InvoiceRecord[] = [...keepPaid];
  if (mode === "full") {
    const inv: InvoiceRecord = {
      id: newId("inv"),
      jobId,
      type: "full",
      amount: accepted.total,
      status: "open",
      stripeCheckoutSessionId: null,
      pdfUrl: null,
      unlockAfterId: null,
      createdAt: ts,
      updatedAt: ts,
    };
    db.invoices.push(inv);
    created.push(inv);
  } else {
    const depositAmt = Math.round(accepted.total * 50) / 100;
    const balanceAmt = Math.round((accepted.total - depositAmt) * 100) / 100;
    const deposit: InvoiceRecord = {
      id: newId("inv"),
      jobId,
      type: "deposit",
      amount: depositAmt,
      status: "open",
      stripeCheckoutSessionId: null,
      pdfUrl: null,
      unlockAfterId: null,
      createdAt: ts,
      updatedAt: ts,
    };
    const balance: InvoiceRecord = {
      id: newId("inv"),
      jobId,
      type: "balance",
      amount: balanceAmt,
      status: "draft",
      stripeCheckoutSessionId: null,
      pdfUrl: null,
      unlockAfterId: deposit.id,
      createdAt: ts,
      updatedAt: ts,
    };
    db.invoices.push(deposit, balance);
    created.push(deposit, balance);
  }
  job.status = "invoice";
  job.updatedAt = ts;
  await save(db);
  return created.filter((i) => i.jobId === jobId);
}

export async function setInvoiceCheckout(
  invoiceId: string,
  ownerId: string,
  sessionId: string,
  pdfUrl?: string | null,
): Promise<InvoiceRecord | null> {
  const db = await load();
  const inv = db.invoices.find((i) => i.id === invoiceId);
  if (!inv) return null;
  const job = db.jobs.find((j) => j.id === inv.jobId && j.ownerId === ownerId);
  if (!job) return null;
  inv.stripeCheckoutSessionId = sessionId;
  if (pdfUrl !== undefined) {
    // Never persist data: URLs — keep route path if PDF bytes already stored
    inv.pdfUrl = isDataUrlPdf(pdfUrl)
      ? invoicePdfPath(inv.jobId, inv.id)
      : pdfUrl;
  }
  inv.status = inv.status === "draft" ? "open" : inv.status;
  inv.updatedAt = now();
  job.updatedAt = now();
  await save(db);
  return publicInvoice(inv);
}

export async function markInvoicePaidBySession(
  sessionId: string,
  paymentIntentId?: string | null,
): Promise<InvoiceRecord | null> {
  const db = await load();
  const inv = db.invoices.find((i) => i.stripeCheckoutSessionId === sessionId);
  if (!inv) return null;
  if (inv.status === "paid") return inv;
  inv.status = "paid";
  inv.updatedAt = now();
  const payment: PaymentRecord = {
    id: newId("pay"),
    invoiceId: inv.id,
    amount: inv.amount,
    status: "succeeded",
    stripePaymentIntentId: paymentIntentId ?? null,
    createdAt: now(),
  };
  db.payments.push(payment);
  // Unlock balance invoices
  for (const other of db.invoices) {
    if (other.unlockAfterId === inv.id && other.status === "draft") {
      other.status = "open";
      other.updatedAt = now();
    }
  }
  const job = db.jobs.find((j) => j.id === inv.jobId);
  if (job) {
    const jobInvoices = db.invoices.filter((i) => i.jobId === job.id);
    const allPaid =
      jobInvoices.length > 0 && jobInvoices.every((i) => i.status === "paid");
    if (allPaid) job.status = "completed";
    job.updatedAt = now();
  }
  await save(db);
  return inv;
}

export async function advanceJobStatus(
  jobId: string,
  ownerId: string,
  status: JobStatus,
): Promise<JobRecord | null> {
  return updateJob(jobId, ownerId, { status });
}

export type { InvoiceType };
