export type JobStatus =
  | "start"
  | "site_capture"
  | "design"
  | "estimate"
  | "invoice"
  | "completed";

export type ScanType = "photo" | "scan_3d" | "pdf" | "other";
export type MeasureUnit = "in" | "ft";
export type LineItemCategory = "material" | "labor" | "install" | "permit";
export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "expired";
export type InvoiceType = "deposit" | "balance" | "full";
export type InvoiceStatus = "draft" | "open" | "paid" | "void";
export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";

export type Vec3 = { x: number; y: number; z: number };

export type MeasurementAnnotation = {
  scanId: string;
  /** Normalized image coords (0–1) for photo annotations; 0 for LiDAR-only. */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  realLength: number;
  /** Optional ARKit world-space endpoints (meters). */
  start3d?: Vec3;
  end3d?: Vec3;
  source?: "photo" | "lidar" | "roomplan";
};

export type ReferenceImage = {
  url: string;
  fileName: string;
};

export type JobRecord = {
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
  createdAt: string;
  updatedAt: string;
};

export type ScanRecord = {
  id: string;
  jobId: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  type: ScanType;
  createdAt: string;
};

export type MeasurementRecord = {
  id: string;
  jobId: string;
  label: string;
  width: number | null;
  height: number | null;
  unit: MeasureUnit;
  annotation: MeasurementAnnotation | null;
  createdAt: string;
};

export type DesignSpecRecord = {
  id: string;
  jobId: string;
  signType: string;
  description: string;
  notes: string;
  referenceImages: ReferenceImage[];
  updatedAt: string;
};

export type LineItemRecord = {
  id: string;
  jobId: string;
  category: LineItemCategory;
  description: string;
  qty: number;
  unitCost: number;
  markupPct: number;
  catalogKey: string | null;
  sortOrder: number;
  createdAt: string;
};

export type QuoteRecord = {
  id: string;
  jobId: string;
  version: number;
  subtotal: number;
  tax: number;
  total: number;
  pdfUrl: string | null;
  status: QuoteStatus;
  acceptToken: string;
  validUntil: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceRecord = {
  id: string;
  jobId: string;
  type: InvoiceType;
  amount: number;
  status: InvoiceStatus;
  stripeCheckoutSessionId: string | null;
  pdfUrl: string | null;
  unlockAfterId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaymentRecord = {
  id: string;
  invoiceId: string;
  amount: number;
  status: PaymentStatus;
  stripePaymentIntentId: string | null;
  createdAt: string;
};

export type JobBundle = {
  job: JobRecord;
  scans: ScanRecord[];
  measurements: MeasurementRecord[];
  designSpec: DesignSpecRecord | null;
  lineItems: LineItemRecord[];
  quotes: QuoteRecord[];
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
};

export const JOB_STAGES: {
  status: JobStatus;
  step: number;
  label: string;
}[] = [
  { status: "start", step: 1, label: "Start job" },
  { status: "site_capture", step: 2, label: "Site capture" },
  { status: "design", step: 3, label: "Design" },
  { status: "estimate", step: 4, label: "Estimate" },
  { status: "invoice", step: 5, label: "Invoice" },
];

export function stageIndex(status: JobStatus): number {
  if (status === "completed") return 5;
  const found = JOB_STAGES.findIndex((s) => s.status === status);
  return found >= 0 ? found + 1 : 1;
}

export function lineItemExtended(item: Pick<LineItemRecord, "qty" | "unitCost" | "markupPct">) {
  const base = item.qty * item.unitCost;
  return base * (1 + item.markupPct / 100);
}

export function computeTotals(
  items: Pick<LineItemRecord, "qty" | "unitCost" | "markupPct">[],
  taxRatePct: number,
) {
  const subtotal = items.reduce((sum, item) => sum + lineItemExtended(item), 0);
  const tax = subtotal * (taxRatePct / 100);
  return {
    subtotal: round2(subtotal),
    tax: round2(tax),
    total: round2(subtotal + tax),
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
