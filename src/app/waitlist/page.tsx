import Link from "next/link";
import { MarketingNav } from "@/components/marketing/MarketingNav";

type Props = {
  searchParams: Promise<{ zip?: string }>;
};

export default async function WaitlistPage({ searchParams }: Props) {
  const sp = await searchParams;
  const zip = typeof sp.zip === "string" ? sp.zip.trim() : "";

  return (
    <div className="min-h-full bg-offwhite">
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
        <div className="relative z-10 mx-auto max-w-xl px-5 md:px-8">
          <p className="text-sm font-bold uppercase tracking-wide text-white/60">
            Coverage
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            Not yet covered
            {zip ? ` — ${zip}` : ""}
          </h1>
          <p className="mt-4 text-base text-white/75">
            We don&apos;t score permits in that zip yet. You&apos;re on the
            waitlist — we&apos;ll email you when your metro goes live.
          </p>
          <p className="mt-3 text-sm text-white/55">
            Live now: NYC, Chicago, LA, Boston, SF, Seattle, Fort Worth,
            Miami-Dade.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/25 px-5 text-sm font-bold text-white"
            >
              Try a different zip
            </Link>
            <Link
              href="/login"
              className="pc-gradient-bg inline-flex h-12 items-center justify-center rounded-full px-5 text-sm font-bold text-white"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
