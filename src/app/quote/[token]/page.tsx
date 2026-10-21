import { notFound } from "next/navigation";
import { getJobByQuoteToken } from "@/lib/jobs/store";
import { acceptQuotePublicAction } from "@/app/actions/jobs";

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const bundle = await getJobByQuoteToken(token);
  if (!bundle) notFound();
  const quote = bundle.quotes.find((q) => q.acceptToken === token);
  if (!quote) notFound();
  const { job } = bundle;
  const accepted = quote.status === "accepted";

  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg bg-offwhite px-4 py-12">
      <p className="text-xs font-bold uppercase tracking-wide text-slate">
        {job.companyName}
      </p>
      <h1 className="mt-1 text-2xl font-bold text-ink">Signage quote</h1>
      <p className="mt-2 text-sm text-slate">
        Prepared for {job.customerName || "you"} · {job.siteAddress || "site TBD"}
      </p>
      <div className="mt-6 rounded-2xl border border-line bg-white p-5">
        <p className="text-sm text-slate">Quote v{quote.version}</p>
        <p className="mt-1 text-3xl font-bold text-ink">
          ${quote.total.toFixed(2)}
        </p>
        <p className="mt-1 text-xs text-slate">
          Subtotal ${quote.subtotal.toFixed(2)} · Tax ${quote.tax.toFixed(2)}
        </p>
        {quote.validUntil ? (
          <p className="mt-2 text-xs text-slate">
            Valid until {new Date(quote.validUntil).toLocaleDateString()}
          </p>
        ) : null}
        {quote.pdfUrl ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={`/quote/${token}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-bold text-purple underline"
            >
              Open PDF
            </a>
            <a
              href={`/quote/${token}/pdf?download=1`}
              className="text-sm font-bold text-ink underline"
            >
              Download PDF
            </a>
          </div>
        ) : null}
        <p className="mt-4 text-xs text-slate">{job.terms}</p>
      </div>

      {accepted ? (
        <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
          Quote accepted. The sign shop will send an invoice next.
        </p>
      ) : (
        <form
          action={async () => {
            "use server";
            const res = await acceptQuotePublicAction(token);
            if (!res.ok) {
              // Surface to the form error boundary with a real message (not #441).
              throw new Error(res.error);
            }
          }}
          className="mt-6"
        >
          <button
            type="submit"
            className="pc-gradient-bg flex h-14 w-full items-center justify-center rounded-full text-base font-bold text-white"
          >
            Approve &amp; accept quote
          </button>
        </form>
      )}
    </div>
  );
}
