import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/auth/admin";
import { getSession } from "@/lib/auth/session";
import { PICKER_CITIES } from "@/lib/cities/picker";
import { DEMO_STEPS } from "@/lib/demo/types";
import { DemoShareCopy } from "@/components/demo/DemoShareCopy";

export const dynamic = "force-dynamic";

export default async function DemoSharePage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/demo/share");
  if (!isAdminEmail(session.email)) {
    return (
      <main className="mx-auto max-w-lg px-5 py-12">
        <p className="text-xs font-bold uppercase tracking-wide text-slate">
          Internal · 403
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink">Demo share links</h1>
        <p className="mt-3 text-sm text-slate">
          Admin only. Your account ({session.email}) is not on the allow-list.
        </p>
        <Link href="/app/home" className="mt-6 inline-block text-sm font-semibold text-[#2563EB]">
          ← Back to app
        </Link>
      </main>
    );
  }

  const served = PICKER_CITIES.filter((c) => c.served);
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <p className="text-xs font-bold uppercase tracking-wide text-[#2563EB]">
        Admin · sales
      </p>
      <h1 className="mt-1 text-3xl font-bold text-ink">Demo share links</h1>
      <p className="mt-2 text-sm text-slate">
        Public demo uses past-window commercial projects. Live mode (
        <code className="text-xs">?live=1</code>) needs your admin login.
      </p>

      <section className="mt-10">
        <h2 className="text-lg font-bold">Copy links by city</h2>
        <ul className="mt-4 space-y-3">
          {served.map((c) => {
            const path = `/demo?city=${c.id}`;
            const present = `/demo?city=${c.id}&present=1`;
            const live = `/demo?city=${c.id}&live=1&present=1`;
            return (
              <li
                key={c.id}
                className="rounded-2xl border border-line bg-white p-4"
              >
                <p className="font-bold text-ink">{c.label}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <DemoShareCopy label="Public" path={path} origin={origin} />
                  <DemoShareCopy label="Present" path={present} origin={origin} />
                  <DemoShareCopy label="Live" path={live} origin={origin} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-bold">Sales script (one line each)</h2>
        <ol className="mt-4 space-y-3">
          {DEMO_STEPS.map((s, i) => (
            <li key={s.id} className="rounded-xl border border-line bg-offwhite p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-[#2563EB]">
                {i + 1}. {s.title}
              </p>
              <p className="mt-1 text-sm text-ink">{s.script}</p>
            </li>
          ))}
        </ol>
      </section>

      <p className="mt-10 text-sm">
        <Link href="/admin/demo" className="font-semibold text-[#2563EB]">
          Demo analytics &amp; leads →
        </Link>
      </p>
    </main>
  );
}
