/**
 * Canonical PDF route paths stored in Quote/Invoice.pdfUrl.
 * Never use data: URLs — Chrome blocks navigating to them from <a target=_blank>.
 */

/** Soft cap under Netlify function response limits (~6MB). */
export const MAX_PDF_RESPONSE_BYTES = 4 * 1024 * 1024;

export function quotePdfPath(jobId: string, quoteId: string) {
  return `/api/jobs/${jobId}/quotes/${quoteId}/pdf`;
}

export function invoicePdfPath(jobId: string, invoiceId: string) {
  return `/api/jobs/${jobId}/invoices/${invoiceId}/pdf`;
}

export function publicQuotePdfPath(token: string) {
  return `/quote/${token}/pdf`;
}

export function decodeDataUrlPdf(url: string): Buffer | null {
  const m = /^data:application\/pdf;base64,(.+)$/i.exec(url.trim());
  if (!m?.[1]) return null;
  try {
    return Buffer.from(m[1], "base64");
  } catch {
    return null;
  }
}

export function isDataUrlPdf(url: string | null | undefined): boolean {
  return Boolean(url && /^data:application\/pdf;base64,/i.test(url));
}

export type PdfPayload = {
  bytes: Buffer;
  fileName: string;
  version?: number;
};

export function pdfResponseHeaders(
  fileName: string,
  opts: { download?: boolean; byteLength: number },
): HeadersInit {
  const disposition = opts.download
    ? `attachment; filename="${fileName}"`
    : `inline; filename="${fileName}"`;
  return {
    "Content-Type": "application/pdf",
    "Content-Disposition": disposition,
    "Content-Length": String(opts.byteLength),
    "Cache-Control": "private, max-age=60",
  };
}
