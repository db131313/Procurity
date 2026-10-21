import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/auth/admin";
import { getSession } from "@/lib/auth/session";
import { countDemoEvents, listDemoLeads } from "@/lib/demo/store";

export const dynamic = "force-dynamic";

export default async function AdminDemoPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin/demo");
  if (session.demo) redirect("/login?next=/admin/demo");
  if (!isAdminEmail(session.email)) {
    return (
      <main className="mx-auto max-w-lg px-5 py-12">
        <p className="text-xs font-bold uppercase tracking-wide text-slate">
          Internal · 403
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink">Admin · Demo</h1>
        <p className="mt-3 text-sm text-slate">
          Your account ({session.email}) is not on the admin allow-list.
        </p>
        <Link href="/app/home" className="mt-6 inline-block text-sm font-semibold text-[#2563EB]">
          ← Back to app
        </Link>
      </main>
    );
  }

  const [counts, leads] = await Promise.all([
    countDemoEvents(),
    listDemoLeads(40),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <p className="text-xs font-bold uppercase tracking-wide text-[#2563EB]">
        Admin
      </p>
      <h1 className="mt-1 text-3xl font-bold text-ink">Demo mode notes</h1>

      <section className="mt-8 rounded-2xl border border-line bg-offwhite p-5 text-sm leading-relaxed text-slate">
        <h2 className="font-bold text-ink">What each mode shows</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            <strong className="text-ink">Public demo</strong> (
            <code className="text-xs">/demo</code>): real commercial / non-residential
            projects that are past the buying window (phase{" "}
            <code className="text-xs">signage_filed</code> or last activity older than
            60 days). Up to 12 per city. If fewer than 6 qualify, we add clearly
            labeled <em>Sample project</em> fillers. Owner, GC, architect names,
            phones, emails, and filing numbers are never shown.
          </li>
          <li>
            <strong className="text-ink">Live mode</strong> (
            <code className="text-xs">/demo?live=1</code>): fresh real projects for a
            chosen zip. Requires a logged-in admin or demo-user session — enforced
            on the server. Contacts stay masked unless the presenter toggles Reveal
            contacts.
          </li>
          <li>
            <strong className="text-ink">Presenter mode</strong> (
            <code className="text-xs">?present=1</code>): larger text/controls, hides
            signup nags, arrow keys move between steps.
          </li>
        </ul>
        <p className="mt-4">
          Share links and sales scripts:{" "}
          <Link href="/demo/share" className="font-semibold text-[#2563EB]">
            /demo/share
          </Link>
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold">Analytics counts</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            "demo_started",
            "step_completed",
            "demo_finished",
            "cta_clicked",
            "lead_submitted",
          ].map((t) => (
            <div
              key={t}
              className="rounded-xl border border-line bg-white px-4 py-3"
            >
              <dt className="text-xs font-bold uppercase tracking-wide text-slate">
                {t}
              </dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums text-ink">
                {counts[t] ?? 0}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold">Walkthrough leads</h2>
        {leads.length === 0 ? (
          <p className="mt-3 text-sm text-slate">No leads yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {leads.map((l) => (
              <li
                key={l.id}
                className="rounded-xl border border-line bg-white p-4 text-sm"
              >
                <p className="font-bold text-ink">
                  {l.name}{" "}
                  <span className="font-normal text-slate">· {l.email}</span>
                </p>
                <p className="mt-1 text-slate">
                  {l.phone || "—"} · {l.shopName || "—"} · {l.city || "—"}
                </p>
                <p className="mt-1 text-xs text-slate">
                  {new Date(l.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-10 text-sm text-slate">
        Env for lead email: <code className="text-xs">RESEND_API_KEY</code>,{" "}
        <code className="text-xs">RESEND_FROM_EMAIL</code>,{" "}
        <code className="text-xs">DEMO_LEAD_EMAIL</code> (or{" "}
        <code className="text-xs">ADMIN_EMAIL</code>). Without them, leads still
        save here and email is stubbed.
      </p>
    </main>
  );
}
