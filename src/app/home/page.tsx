import Link from "next/link";
import { LogoWordmark } from "@/components/mobile/Logo";
import { PhoneShell } from "@/components/mobile/PhoneShell";
import { getTop20Sites } from "@/lib/intel";
import { toOpportunity } from "@/lib/opportunity";

export default async function HomeFeedPage() {
  const intel = await getTop20Sites();
  const opps = intel.sites.slice(0, 12).map((s, i) => toOpportunity(s, i));

  return (
    <PhoneShell>
      <main className="min-h-[100dvh] bg-pc-mist px-5 pb-8 pt-6">
        <LogoWordmark />
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-pc-ink">
          Today&apos;s opportunities
        </h1>
        <p className="mt-1 text-sm text-pc-slate">
          Top sites inside the signage buying window.
        </p>

        <div className="mt-5 space-y-3">
          {opps.map((opp) => (
            <Link
              key={opp.id}
              href={`/opportunity/${encodeURIComponent(opp.id)}`}
              className="block rounded-3xl bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-pc-purple">
                    {opp.heat === "hot" ? "Hot" : opp.windowLabel}
                  </p>
                  <p className="mt-1 text-lg font-bold text-pc-ink">{opp.title}</p>
                  <p className="text-sm text-pc-slate">
                    {opp.address}, {opp.borough}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full pc-gradient-bg text-sm font-bold text-white">
                  {opp.probabilityScore}
                </div>
              </div>
              <div className="mt-3 flex gap-2 text-xs font-semibold text-pc-slate">
                <span className="rounded-full bg-pc-mist px-2.5 py-1">
                  {opp.estOpportunity}
                </span>
                <span className="rounded-full bg-pc-mist px-2.5 py-1">
                  {opp.buyingWindow}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </PhoneShell>
  );
}
