import Link from "next/link";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { PhaseShowcase } from "@/components/marketing/PhaseShowcase";
import { Logo } from "@/components/brand/Logo";

const STEPS = [
  {
    title: "Ingest open construction data",
    body: "Nightly sync of NYC DOB filings, permits, and CO activity into city-agnostic project records.",
  },
  {
    title: "Score the buying window",
    body: "Phase fit, recency, size, occupancy, and GC signals become a transparent 0–100 Buy Score.",
  },
  {
    title: "Map & prioritize",
    body: "Hot pins on free OpenFreeMap tiles. Filter Hot / Buying Now / New and open project detail.",
  },
  {
    title: "Pipeline to close",
    body: "Move deals New → Contacted → Quoted → Won. Celebrate wins and track your rate.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="bg-offwhite">
      <section className="relative overflow-hidden bg-ink pb-16 pt-28 text-white">
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse at 20% 20%, rgba(56,217,201,0.25), transparent 45%), linear-gradient(180deg,#0B0F19,#121826)",
          }}
        />
        <MarketingNav />
        <div className="relative z-10 mx-auto max-w-6xl px-5 md:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal">
            How it works
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
            From permit noise to today&apos;s visit list
          </h1>
          <p className="mt-4 max-w-xl text-white/70">
            Procurity turns construction activity into signage-ready opportunities
            your team can act on before the fascia goes dark.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <div className="grid gap-6 md:grid-cols-2">
          {STEPS.map((step, i) => (
            <article key={step.title} className="pc-card p-6">
              <span className="pc-gradient-text text-3xl font-bold tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 className="mt-3 text-xl font-bold text-ink">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white px-5 py-16 md:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold tracking-tight text-ink">
            Phase timeline
          </h2>
          <p className="mt-2 max-w-xl text-slate">
            Interior finishing and sign-ready phases carry the highest buy probability.
          </p>
          <div className="mt-10">
            <PhaseShowcase />
          </div>
          <Link
            href="/signup"
            className="pc-gradient-bg mt-10 inline-flex h-14 items-center justify-center rounded-full px-7 text-sm font-bold text-white"
          >
            Start Free Trial
          </Link>
        </div>
      </section>

      <footer className="border-t border-line px-5 py-10 md:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Logo variant="dark" size={28} />
          <Link href="/pricing" className="text-sm font-semibold text-slate">
            Pricing
          </Link>
        </div>
      </footer>
    </div>
  );
}
