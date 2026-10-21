import Link from "next/link";
import { MapPin, MessageSquare, Wallet, Phone, Car, ClipboardCheck } from "lucide-react";
import { MarketingNav } from "./MarketingNav";
import { PricingCards } from "./PricingCards";
import { PreviewDetail, PreviewMap } from "./ProductPreviews";
import { Logo } from "@/components/brand/Logo";
import { HomeTeaserMapSection } from "./HomeTeaserMapSection";
import { CityQuickPick } from "./CityQuickPick";
import type { HomeCoverageStats } from "@/lib/marketing/home-coverage";

type Props = {
  stats: HomeCoverageStats;
  isLoggedIn?: boolean;
};

const HOW_STEPS = [
  {
    title: "See which new projects are ready to buy",
    body: "Open the map and spot jobs that need signs now — not months from now.",
    Icon: MapPin,
  },
  {
    title: "Reach out with the contact and a score that tells you why now",
    body: "Each project shows who to call and a plain-English Buy Score.",
    Icon: MessageSquare,
  },
  {
    title: "Quote and get paid without leaving the app",
    body: "Measure on site, build a quote, and collect a deposit in one flow.",
    Icon: Wallet,
  },
];

const BENEFITS = [
  {
    title: "Call at the right moment",
    body: "Know when a project is actually ready for signage — so you’re not early or late.",
    Icon: Phone,
  },
  {
    title: "Stop driving around guessing",
    body: "See what’s nearby and worth a visit before you leave the shop.",
    Icon: Car,
  },
  {
    title: "Go from lead to paid deposit in one place",
    body: "Map, measure, quote, and invoice without juggling five tools.",
    Icon: ClipboardCheck,
  },
];

export function HomePage({ stats: _stats, isLoggedIn = false }: Props) {
  void _stats;
  void isLoggedIn;

  return (
    <div className="bg-white text-ink">
      {/* 1. Hero */}
      <section className="relative overflow-hidden bg-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #0f172a 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <MarketingNav variant="light" />

        <div className="relative mx-auto max-w-3xl px-5 pb-16 pt-28 text-center md:px-10 md:pb-24 md:pt-32">
          <p className="text-sm font-bold tracking-wide text-[#2563EB]">
            Procurity
          </p>
          <h1 className="mt-4 text-[2rem] font-bold leading-[1.15] tracking-tight sm:text-4xl md:text-5xl">
            Find your next sign job before anyone else does.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate sm:text-lg">
            Procurity shows you which new construction projects are ready to buy
            right now, who to contact, and helps you measure, quote, and get
            paid in one place.
          </p>

          <div className="mx-auto mt-10 max-w-lg text-left">
            <CityQuickPick />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/demo"
              className="inline-flex h-12 min-w-[160px] items-center justify-center rounded-full bg-[#2563EB] px-6 text-sm font-bold text-white transition hover:bg-[#1d4ed8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
            >
              Try the live demo
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center px-3 text-sm font-semibold text-slate underline-offset-4 hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* 2. How it works */}
      <section className="border-t border-line bg-offwhite px-5 py-16 md:px-10 md:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
            How it works
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-slate">
            Three simple steps from map to paid job.
          </p>
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {HOW_STEPS.map((step, i) => (
              <li key={step.title} className="text-center md:text-left">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#2563EB]/10 text-[#2563EB] md:mx-0">
                  <step.Icon className="h-6 w-6" aria-hidden />
                </div>
                <p className="mt-4 text-xs font-bold uppercase tracking-wide text-[#2563EB]">
                  Step {i + 1}
                </p>
                <h3 className="mt-2 text-lg font-bold leading-snug text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 3. Why it's useful */}
      <section className="px-5 py-16 md:px-10 md:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
            Why it&apos;s useful
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-slate">
            Built for sign makers and trade salespeople who sell in the field.
          </p>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {BENEFITS.map((b) => (
              <div key={b.title} className="text-center md:text-left">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate/10 text-ink md:mx-0">
                  <b.Icon className="h-6 w-6" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-bold text-ink">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate">
                  {b.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. See it in action */}
      <section className="border-t border-line bg-offwhite px-5 py-16 md:px-10 md:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
            See it in action
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-slate">
            The map, a project card, and a quote — the core of your day.
          </p>
          <div className="mt-12 grid items-end justify-items-center gap-10 sm:grid-cols-2">
            <PreviewMap />
            <PreviewDetail />
          </div>
          <div className="mt-10 flex justify-center">
            <Link
              href="/demo"
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#2563EB] px-6 text-sm font-bold text-white hover:bg-[#1d4ed8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
            >
              Try the live demo
            </Link>
          </div>
        </div>
      </section>

      {/* 5. Teaser map */}
      <HomeTeaserMapSection initialCityId="nyc" />

      {/* 6. Pricing */}
      <section id="pricing" className="border-t border-line bg-offwhite px-5 py-16 md:px-10 md:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-ink md:text-4xl">
            Simple pricing
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-slate">
            Start with a free trial. Upgrade when your coverage grows.
          </p>
          <div className="mt-10">
            <PricingCards />
          </div>
        </div>
      </section>

      {/* 7. Final CTA */}
      <section className="px-5 py-16 text-center md:px-10 md:py-20">
        <h2 className="text-3xl font-bold md:text-4xl">
          Ready to find your next job?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-slate">
          Try the demo in two minutes, or start a free trial and open your city
          map.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/demo"
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#2563EB] px-6 text-sm font-bold text-white hover:bg-[#1d4ed8]"
          >
            Try the live demo
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-12 items-center justify-center rounded-full border border-line bg-white px-6 text-sm font-bold text-ink hover:border-[#2563EB]/40"
          >
            Start free trial
          </Link>
        </div>
      </section>

      {/* 8. Founder note */}
      <section className="border-t border-line bg-offwhite px-5 py-14 md:px-10">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-lg font-bold text-ink">A note from the founder</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate">
            I built Procurity because I watched good sign shops lose jobs to
            whoever showed up first — not whoever was best. You deserve a clear
            list of who&apos;s ready to buy, and a simple path from the map to a
            paid deposit. This is still early; I&apos;d love your feedback.
          </p>
          <p className="mt-3 text-sm font-semibold text-ink">— Daniel</p>
        </div>
      </section>

      <footer className="border-t border-line bg-white px-5 py-10 md:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <Logo variant="dark" size={32} />
          <div className="flex flex-wrap gap-4 text-sm font-semibold text-slate">
            <Link href="/demo">Demo</Link>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/login">Log in</Link>
            <Link href="/signup">Sign up</Link>
          </div>
          <p className="text-xs text-slate">
            © {new Date().getFullYear()} Procurity · Find your next sign job.
          </p>
        </div>
      </footer>
    </div>
  );
}
