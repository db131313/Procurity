import PDFDocument from "pdfkit";
import type { JobBundle } from "./types";
import { lineItemExtended } from "./types";

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

async function bufferFromDoc(doc: PDFKit.PDFDocument): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    doc.on("data", (c) => chunks.push(Buffer.from(c)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

export async function buildQuotePdf(bundle: JobBundle, quoteId: string) {
  const quote = bundle.quotes.find((q) => q.id === quoteId) ?? bundle.quotes[0];
  if (!quote) throw new Error("Quote not found");
  const { job, lineItems, measurements, designSpec } = bundle;

  const doc = new PDFDocument({ margin: 50, size: "LETTER" });
  doc.fontSize(20).fillColor("#1a1a2e").text(job.companyName || "Procurity Signs", {
    align: "left",
  });
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor("#555").text("Signage estimate / quote", { align: "left" });
  doc.moveDown();
  doc.fontSize(10).fillColor("#111");
  doc.text(`Quote #${quote.version}`);
  doc.text(`Customer: ${job.customerName || "—"}`);
  doc.text(`Email: ${job.customerEmail || "—"}`);
  doc.text(`Phone: ${job.customerPhone || "—"}`);
  doc.text(`Site: ${job.siteAddress || "—"}`);
  if (quote.validUntil) {
    doc.text(`Valid until: ${new Date(quote.validUntil).toLocaleDateString()}`);
  }
  doc.moveDown();

  if (designSpec?.signType || designSpec?.description) {
    doc.fontSize(12).text("Design", { underline: true });
    doc.fontSize(10);
    if (designSpec.signType) doc.text(`Sign type: ${designSpec.signType}`);
    if (designSpec.description) doc.text(designSpec.description);
    if (designSpec.notes) doc.text(`Notes: ${designSpec.notes}`);
    doc.moveDown();
  }

  if (measurements.length) {
    doc.fontSize(12).text("Measurements", { underline: true });
    doc.fontSize(10);
    for (const m of measurements) {
      const dims = [
        m.width != null ? `W ${m.width}` : null,
        m.height != null ? `H ${m.height}` : null,
      ]
        .filter(Boolean)
        .join(" × ");
      doc.text(`• ${m.label}: ${dims || "—"} ${m.unit}`);
    }
    doc.moveDown();
  }

  doc.fontSize(12).text("Line items", { underline: true });
  doc.moveDown(0.4);
  doc.fontSize(9);
  for (const item of lineItems) {
    const ext = lineItemExtended(item);
    doc.text(
      `${item.description}  [${item.category}]  ${item.qty} × ${money(item.unitCost)} +${item.markupPct}%  = ${money(ext)}`,
    );
  }
  doc.moveDown();
  doc.fontSize(11);
  doc.text(`Subtotal: ${money(quote.subtotal)}`);
  doc.text(`Tax: ${money(quote.tax)}`);
  doc.fontSize(13).text(`Total: ${money(quote.total)}`, { underline: true });
  doc.moveDown();
  doc.fontSize(9).fillColor("#444").text(job.terms || "");
  doc.moveDown();
  doc.text(
    "Accept this quote via the secure link in your email. Questions? Reply to this quote.",
  );

  return bufferFromDoc(doc);
}

export async function buildInvoicePdf(
  bundle: JobBundle,
  invoiceId: string,
) {
  const invoice = bundle.invoices.find((i) => i.id === invoiceId);
  if (!invoice) throw new Error("Invoice not found");
  const { job } = bundle;
  const doc = new PDFDocument({ margin: 50, size: "LETTER" });
  doc.fontSize(20).text(job.companyName || "Procurity Signs");
  doc.fontSize(11).fillColor("#555").text("Invoice");
  doc.moveDown();
  doc.fontSize(10).fillColor("#111");
  doc.text(`Invoice type: ${invoice.type}`);
  doc.text(`Status: ${invoice.status}`);
  doc.text(`Customer: ${job.customerName || "—"}`);
  doc.text(`Site: ${job.siteAddress || "—"}`);
  doc.moveDown();
  doc.fontSize(14).text(`Amount due: $${invoice.amount.toFixed(2)}`);
  doc.moveDown();
  doc.fontSize(9).fillColor("#444").text(job.terms || "");
  return bufferFromDoc(doc);
}
