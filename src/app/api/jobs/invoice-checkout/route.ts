import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasJobsAccess } from "@/lib/jobs/access";
import { getJobBundle, setInvoiceCheckout } from "@/lib/jobs/store";
import { buildInvoicePdf } from "@/lib/jobs/pdf";
import { storeJobFile } from "@/lib/jobs/storage";
import { getPaymentProvider } from "@/lib/payments/provider";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasJobsAccess(user)) {
    return NextResponse.json({ error: "Paid plan required" }, { status: 403 });
  }

  const body = (await request.json()) as { jobId?: string; invoiceId?: string };
  if (!body.jobId || !body.invoiceId) {
    return NextResponse.json(
      { error: "jobId and invoiceId required" },
      { status: 400 },
    );
  }

  const bundle = await getJobBundle(body.jobId, user.id);
  if (!bundle) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const invoice = bundle.invoices.find((i) => i.id === body.invoiceId);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  if (invoice.status === "draft") {
    return NextResponse.json(
      { error: "Invoice is locked until the deposit is paid" },
      { status: 409 },
    );
  }
  if (invoice.status === "paid") {
    return NextResponse.json({ error: "Already paid" }, { status: 409 });
  }

  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  let pdfUrl = invoice.pdfUrl;
  try {
    const pdf = await buildInvoicePdf(bundle, invoice.id);
    const stored = await storeJobFile({
      jobId: bundle.job.id,
      fileName: `invoice-${invoice.type}.pdf`,
      mimeType: "application/pdf",
      bytes: pdf,
      folder: "invoices",
    });
    pdfUrl = stored.url;
  } catch {
    // PDF optional if generation fails
  }

  try {
    const provider = getPaymentProvider();
    const checkout = await provider.createCheckoutSession({
      invoiceId: invoice.id,
      jobId: bundle.job.id,
      customerEmail: bundle.job.customerEmail || undefined,
      successUrl: `${base}/app/jobs/${bundle.job.id}?paid=1`,
      cancelUrl: `${base}/app/jobs/${bundle.job.id}?canceled=1`,
      lines: [
        {
          name: `${bundle.job.companyName} — ${invoice.type} invoice`,
          amountCents: Math.round(invoice.amount * 100),
        },
      ],
    });
    await setInvoiceCheckout(
      invoice.id,
      user.id,
      checkout.sessionId,
      pdfUrl,
    );
    return NextResponse.json({
      ok: true,
      url: checkout.url,
      sessionId: checkout.sessionId,
      provider: provider.name,
      pdfUrl,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Checkout failed",
        stub: !process.env.STRIPE_SECRET_KEY,
      },
      { status: 501 },
    );
  }
}
