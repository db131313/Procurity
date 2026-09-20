import Link from "next/link";
import { MarketingNav } from "./MarketingNav";
import { PhaseShowcase } from "./PhaseShowcase";
import { PricingCards } from "./PricingCards";
import {
  PreviewDealWon,
  PreviewDetail,
  PreviewMap,
  PreviewWelcome,
} from "./ProductPreviews";
import { Logo } from "@/components/brand/Logo";
import {
  HeroCityBackground,
  HeroScorePins,
} from "./HeroRouteMap";
import { HomeTeaserMapSection } from "./HomeTeaserMapSection";
import { DataFreshnessBadge } from "@/components/ui/DataFreshnessBadge";
import type { HomeCoverageStats } from "@/lib/marketing/home-coverage";

type Props = {
  stats: HomeCoverageStats;
  /** When true, Plan My Day goes straight into the app orchestration. */
  isLoggedIn?: boolean;
};

const STEPS = [
  {
    title: "Ingest",
    body: "Nightly sync of public permit filings and construction activity — city-agnostic under the hood.",
  },
  {
    title: "Score",
    body: "Phase fit, recency, size, occupancy, and GC signals become a 0–100 Buy Score.",
  },
  {
    title: "Map",
    body: "Hot pins on a free OpenFreeMap — tap for value range and buying window.",
  },
  {
    title: "Close",
    body: "Pipeline from New → Won with alerts when scores jump or phases shift.",
  },
];

const FEATURES = [
  {
    title: "Welcome / daily brief",
    body: "Open the app and see today's top opportunities with scores and estimated deal value.",
    Preview: PreviewWelcome,
  },
  {
    title: "Field map that fits your pocket",
    body: "Filter Hot / Buying Now / New. Full project overlay slides up on pin tap.",
    Preview: PreviewMap,
  },
  {
    title: "Project detail that answers “why?”",
    body: "Checklist, score reasons, and likely signage solutions — heuristic, clearly labeled.",
    Preview: PreviewDetail,
  },
  {
    title: "Celebrate the win",
    body: "Confetti, updated win rate, and a shareable moment when a deal closes.",
    Preview: PreviewDealWon,
  },
];

export function HomePage({ stats, isLoggedIn = false }: Props) {
  const projectLabel =
    stats.projectCount > 0
      ? `${stats.projectCount.toLocaleString()} scored projects`
      : "Live permit scoring";
  const cityLabel =
    stats.cityCount > 0
      ? `${stats.cityCount} metros covered`
      : "Multi-metro coverage";
  const planMyDayHref = isLoggedIn
    ? "/app/plan-my-day"
    : "/login?next=/app/plan-my-day";

  return (
    <div className="bg-offwhite">
      {/* Hero — brand + one headline + primary CTA; agent CTA is additive */}
      <section className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-ink text-white">
        <HeroCityBackground />
        <MarketingNav />

        <div className="pointer-events-none absolute inset-0 z-[12] hidden md:block" aria-hidden>
          <HeroScorePins variant="desktop" />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 pb-10 pt-[4.75rem] md:justify-center md:px-10 md:pb-24 md:pt-28">
          <div className="mb-6 mt-4 flex justify-center md:hidden">
            <HeroScorePins variant="mobile" />
          </div>

          <div className="mt-auto w-full max-w-xl animate-pc-rise md:mt-0 md:max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-teal">
                Procurity.Pro
              </p>
              <span className="inline-flex items-center rounded-full border border-teal/40 bg-teal/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-teal">
                AI
              </span>
            </div>
            <h1 className="mt-3 text-[2.05rem] font-bold leading-[1.12] tracking-tight sm:text-[2.5rem] md:text-5xl lg:text-[3.25rem]">
              Know{" "}
              <span className="pc-gradient-text font-black tracking-wide">
                WHO
              </span>{" "}
              is buying{" "}
              <span className="pc-gradient-text font-black tracking-wide">
                WHAT
              </span>{" "}
              and{" "}
              <span className="pc-gradient-text font-black tracking-wide">
                WHEN
              </span>{" "}
              so you can make more sales.
            </h1>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/70 sm:mt-5 sm:text-base md:text-lg">
              Use better data to better predict procurement windows for new
              construction and commercial building projects in your area.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3 sm:mt-8">
              <Link
                href="/signup"
                className="pc-gradient-bg inline-flex h-14 items-center justify-center rounded-full px-8 text-[15px] font-bold text-white shadow-lg transition hover:brightness-110 active:scale-[0.98]"
              >
                Find My Opportunities
              </Link>
              <Link
                href={planMyDayHref}
                className="inline-flex h-14 items-center justify-center rounded-full border border-teal/45 bg-teal/15 px-6 text-[15px] font-bold text-white backdrop-blur transition hover:bg-teal/25"
              >
                Let the Agent Plan My Day
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex h-14 items-center justify-center rounded-full border border-white/25 bg-white/10 px-6 text-[15px] font-bold text-white backdrop-blur transition hover:bg-white/15"
              >
                How it works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Live data proof — terminal-style density for field reps */}
      <section className="border-b border-line bg-[#0b1220] px-5 py-12 text-white md:px-10 md:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-teal">
                Live coverage
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
                Real open-data permits. Live counts.
              </h2>
              <p className="mt-2 max-w-xl text-sm text-white/60">
                Numbers refresh from the project database on every page load —
                built for reps who need confidence mid-route.
              </p>
            </div>
            <DataFreshnessBadge
              iso={stats.lastSyncAt}
              label="Last sync"
              variant="panel"
              className="shrink-0 border-teal/40 bg-teal/15 text-white [&_span.uppercase]:text-white/70 [&_.font-mono]:text-white"
            />
          </div>

          <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-3">
            <div className="bg-[#0f172a] px-5 py-6">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
                Projects scored
              </p>
              <p className="mt-2 font-mono text-4xl font-bold tabular-nums tracking-tight text-teal md:text-5xl">
                {stats.projectCount > 0
                  ? stats.projectCount.toLocaleString()
                  : "—"}
              </p>
              <p className="mt-2 text-xs font-semibold text-white/55">
                {projectLabel}
              </p>
            </div>
            <div className="bg-[#0f172a] px-5 py-6">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
                Metros live
              </p>
              <p className="mt-2 font-mono text-4xl font-bold tabular-nums tracking-tight text-white md:text-5xl">
                {stats.cityCount}
              </p>
              <p className="mt-2 text-xs font-semibold text-white/55">
                {cityLabel}
              </p>
            </div>
            <div className="bg-[#0f172a] px-5 py-6 sm:col-span-1">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
                Top metros
              </p>
              <ul className="mt-3 space-y-2">
                {(stats.cities.length
                  ? stats.cities
                  : [{ id: "nyc", label: "NYC", count: 0 }]
                )
                  .slice(0, 5)
                  .map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 font-mono text-sm"
                    >
                      <span className="font-semibold text-white/80">
                        {c.label}
                      </span>
                      <span className="tabular-nums font-bold text-teal">
                        {c.count > 0 ? c.count.toLocaleString() : "—"}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-5 py-16 md:px-10 md:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold tracking-tight text-ink md:text-4xl">
            How it works
          </h2>
          <p className="mt-3 max-w-xl text-slate">
            From open data to closed deals — four steps, zero cold miles.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <div key={step.title} className="border-l-2 border-teal/40 pl-4">
                <span className="pc-gradient-text font-mono text-2xl font-bold tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-lg font-bold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <HomeTeaserMapSection initialCityId="nyc" />

      {/* Feature showcase */}
      <section className="bg-offwhite px-5 py-16 md:px-10 md:py-24">
        <div className="mx-auto max-w-6xl space-y-20">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`grid items-center gap-10 md:grid-cols-2 ${
                i % 2 === 1 ? "md:[&>div:first-child]:order-2" : ""
              }`}
            >
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-ink md:text-3xl">
                  {f.title}
                </h2>
                <p className="mt-3 text-slate">{f.body}</p>
              </div>
              <f.Preview />
            </div>
          ))}
        </div>
      </section>

      <PhaseShowcase />

      <section id="pricing" className="bg-white px-5 py-16 md:px-10 md:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-ink md:text-4xl">
            Pricing that fits the route
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-slate">
            Start with a free trial. Upgrade when your zip coverage grows.
          </p>
          <div className="mt-10">
            <PricingCards />
          </div>
        </div>
      </section>

      <section className="bg-ink px-5 py-16 text-center text-white md:px-10">
        <h2 className="text-3xl font-bold md:text-4xl">Start your free trial.</h2>
        <p className="mx-auto mt-3 max-w-md text-white/65">
          7 days of full access. No credit card required in demo mode.
        </p>
        <Link
          href="/signup"
          className="pc-gradient-bg mt-8 inline-flex h-14 items-center justify-center rounded-full px-8 text-sm font-bold text-white"
        >
          Find My Opportunities
        </Link>
      </section>

      <footer className="border-t border-line bg-white px-5 py-10 md:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <Logo variant="dark" size={32} />
          <div className="flex flex-wrap gap-4 text-sm font-semibold text-slate">
            <Link href="/how-it-works">How it works</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/login">Log in</Link>
            <Link href="/signup">Sign up</Link>
          </div>
          <p className="text-xs text-slate">
            © {new Date().getFullYear()} Procurity.Pro · Find the next job
            before they need you.
          </p>
        </div>
      </footer>
    </div>
  );
}
