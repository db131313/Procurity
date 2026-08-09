import Link from "next/link";
import { Nav } from "@/components/Nav";

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="hero-skyline" aria-hidden />
      <div className="atmosphere" aria-hidden />

      <Nav />

      <main className="relative z-10 flex flex-1 flex-col justify-end px-5 pb-16 pt-24 md:px-10 md:pb-24">
        <div className="max-w-4xl">
          <p className="animate-sweep text-sm uppercase tracking-[0.28em] text-teal-bright/90">
            Construction project intel
          </p>
          <h1 className="brand-mark animate-rise mt-4 text-5xl font-bold leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
            Procurity<span className="text-teal-bright">.Pro</span>
          </h1>
          <p className="animate-rise-delay mt-5 max-w-xl text-lg text-sand/80 md:text-xl">
            When signage sales asks &quot;who is ready to buy?&quot; — this is the
            answer. Top 20 NYC sites to visit today, with probability scores and
            contacts.
          </p>
          <div className="animate-rise-delay-2 mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-md bg-teal px-5 py-3 text-sm font-semibold text-ink transition hover:bg-teal-bright"
            >
              Open today&apos;s brief
            </Link>
            <Link
              href="/signin"
              className="rounded-md border border-sand/25 px-5 py-3 text-sm font-medium text-sand transition hover:border-teal-bright/50"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>

      <section className="relative z-10 border-t border-[var(--line)] bg-[rgba(8,20,27,0.72)] px-5 py-16 md:px-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="brand-mark max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
            Not another lead list — a procurement window engine.
          </h2>
          <p className="mt-3 max-w-2xl text-sand/65">
            Procurity.Pro scores live NYC Department of Buildings filings for
            signage buy-readiness, then hands your field team a ranked visit plan.
          </p>

          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              {
                title: "NYC DOB NOW signal",
                body: "New buildings, CO alterations, and SIGN-flagged jobs pulled from open city data — refreshed for today’s route.",
              },
              {
                title: "Probability, not vibes",
                body: "Each site gets a buy-probability score from status, scale, timing, and contactability so you prioritize the open window.",
              },
              {
                title: "3D field map",
                body: "Walk the city with extruded buildings and pinned Top 20 targets — owner, applicant, and permittee intel in one brief.",
              },
            ].map((item) => (
              <div key={item.title}>
                <h3 className="brand-mark text-xl font-semibold text-sand">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-sand/60">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-[var(--line)] px-5 py-6 text-sm text-sand/45 md:px-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <span className="brand-mark font-semibold text-sand/70">
            Procurity.Pro
          </span>
          <span>Built for signage sales teams hunting NYC construction cycles.</span>
        </div>
      </footer>
    </div>
  );
}
