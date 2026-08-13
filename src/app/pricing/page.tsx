import Link from "next/link";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { PricingCards } from "@/components/marketing/PricingCards";
import { Logo } from "@/components/brand/Logo";

export default function PricingPage() {
  return (
    <div className="bg-offwhite">
      <section className="relative overflow-hidden bg-ink pb-16 pt-28 text-white">
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse at 70% 0%, rgba(124,108,246,0.35), transparent 50%), linear-gradient(180deg,#0B0F19,#121826)",
          }}
        />
        <MarketingNav />
        <div className="relative z-10 mx-auto max-w-6xl px-5 md:px-8">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Pricing that scales with your territory
          </h1>
          <p className="mt-4 max-w-xl text-white/70">
            Start free for 7 days. Upgrade when you&apos;re ready to cover more
            zips and close more deals.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 md:px-8">
        <PricingCards ctaHref="/signup" />
      </section>

      <footer className="border-t border-line bg-white px-5 py-10 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <Logo variant="dark" size={28} />
          <Link href="/how-it-works" className="text-sm font-semibold text-slate">
            How it works
          </Link>
        </div>
      </footer>
    </div>
  );
}
