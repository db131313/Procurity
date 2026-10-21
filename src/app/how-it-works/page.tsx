import Link from "next/link";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Logo } from "@/components/brand/Logo";

const STEPS = [
  {
    title: "See projects ready to buy",
    body: "Open the map for your city and spot new construction that needs signs now.",
  },
  {
    title: "Know who to call and why now",
    body: "Each project includes a contact path and a Buy Score with plain-English reasons.",
  },
  {
    title: "Quote and get paid in one place",
    body: "Measure on site, build a quote, send it, and collect a deposit without leaving the app.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="bg-white">
      <section className="relative border-b border-line bg-offwhite pb-16 pt-28">
        <MarketingNav variant="light" />
        <div className="relative z-10 mx-auto max-w-3xl px-5 text-center md:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2563EB]">
            How it works
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink md:text-5xl">
            From map to paid job
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-slate">
            Procurity helps you find projects that are ready for signage, reach
            the right person, and close without juggling tools.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16 md:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <article key={step.title}>
              <span className="text-3xl font-bold tabular-nums text-[#2563EB]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 className="mt-3 text-xl font-bold text-ink">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate">
                {step.body}
              </p>
            </article>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            href="/demo"
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#2563EB] px-6 text-sm font-bold text-white"
          >
            Try the live demo
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-12 items-center justify-center rounded-full border border-line bg-white px-6 text-sm font-bold text-ink"
          >
            Start free trial
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
