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
import { AnimatedCounters } from "./AnimatedCounters";
import {
  HeroCityBackground,
  HeroScorePins,
} from "./HeroRouteMap";
import { CityQuickPick } from "./CityQuickPick";

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
    body: "Filter Hot / Buying Now / New. Bottom sheet previews slide up on pin tap.",
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

// PLACEHOLDER STATS — replace with real metrics when available
const SOCIAL = [
  "500+ NYC projects scored weekly",
  "Avg. buying window surfaced in days",
  "Built for sign shop sales teams",
];

export function HomePage() {
  return (
    <div className="bg-offwhite">
      {/* Hero — matches provided mockups (photo bg, exact copy, hamburger nav) */}
      <section className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-ink text-white">
        <HeroCityBackground />
        <MarketingNav />

        {/* Desktop pins (absolute over photo) */}
        <div className="pointer-events-none absolute inset-0 z-[12] hidden md:block" aria-hidden>
          <HeroScorePins variant="desktop" />
        </div>

        <div className="relative z-10 flex w-full flex-1 flex-col px-5 pb-10 pt-[4.75rem] md:justify-center md:pb-24 md:pl-12 md:pr-10 md:pt-28 lg:pr-16">
          {/* Mobile: featured pin centered under nav */}
          <div className="mb-6 mt-4 flex justify-center md:hidden">
            <HeroScorePins variant="mobile" />
          </div>

          {/* Copy column — capped so pins stay in the clear right zone */}
          <div className="mt-auto w-full max-w-xl animate-pc-rise md:mt-0 md:max-w-[min(34rem,44vw)]">
            <h1 className="text-[2.05rem] font-bold leading-[1.12] tracking-tight sm:text-[2.5rem] md:text-5xl lg:text-[3.25rem]">
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
              construction, and commercial building projects in your area.
            </p>
            <div className="mt-7 sm:mt-8">
              <CityQuickPick variant="dark" />
            </div>
          </div>
        </div>
      </section>

      {/* Social proof — PLACEHOLDER STATS */}
      <section className="border-b border-line bg-white px-5 py-6 md:px-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3 md:justify-between">
          {SOCIAL.map((s) => (
            <span
              key={s}
              className="rounded-full bg-offwhite px-4 py-2 text-xs font-bold text-slate md:text-sm"
            >
              {s}
            </span>
          ))}
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
              <div key={step.title} className="pc-card p-5">
                <span className="pc-gradient-text text-3xl font-bold tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-lg font-bold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature showcase */}
      <section className="bg-white px-5 py-16 md:px-10 md:py-24">
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

      <AnimatedCounters />

      {/* Testimonials PLACEHOLDER */}
      <section className="px-5 py-16 md:px-10 md:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-ink">Reps who stopped driving blind</h2>
          <div className="mt-8 flex snap-x gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible">
            {[
              {
                q: "I used to burn mornings on cold calls. Now I open the map and know the three stops that matter.",
                n: "Jordan M.",
                c: "Metro Sign Co",
              },
              {
                q: "The Buy Score reasons screen sells itself to my team. They trust why a job is hot.",
                n: "Priya S.",
                c: "Northside Graphics",
              },
              {
                q: "We closed a lobby package two weeks earlier because Procurity flagged finishing phase.",
                n: "Alex R.",
                c: "Harbor Signs",
              },
            ].map((t) => (
              <blockquote
                key={t.n}
                className="pc-card min-w-[280px] snap-center p-5 md:min-w-0"
              >
                <p className="text-sm leading-relaxed text-ink">&ldquo;{t.q}&rdquo;</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full pc-gradient-bg text-sm font-bold text-white">
                    {t.n[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink">{t.n}</p>
                    <p className="text-xs text-slate">{t.c}</p>
                  </div>
                </div>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

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
            © {new Date().getFullYear()} Procurity.Pro · Find the next job before they need you.
          </p>
        </div>
      </footer>
    </div>
  );
}
