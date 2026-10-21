import Link from "next/link";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { PricingCards } from "@/components/marketing/PricingCards";
import { Logo } from "@/components/brand/Logo";

export default function PricingPage() {
  return (
    <div className="bg-white">
      <section className="relative border-b border-line bg-offwhite pb-16 pt-28">
        <MarketingNav variant="light" />
        <div className="relative z-10 mx-auto max-w-3xl px-5 text-center md:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-ink md:text-5xl">
            Simple pricing
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-slate">
            Start free for 7 days. Have an access code? Enter it on signup — or
            on checkout — and it applies before you pay.
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
