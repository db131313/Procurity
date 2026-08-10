import Link from "next/link";
import { LogoMark } from "@/components/mobile/Logo";
import { PhoneShell } from "@/components/mobile/PhoneShell";
import { WelcomeHeroSection } from "@/components/mobile/WelcomeHeroSection";
import { auth } from "@/lib/auth";
import { getTop20Sites } from "@/lib/intel";

export default async function WelcomePage() {
  const session = await auth();
  const ctaHref = session?.user ? "/map" : "/signin";
  const intel = await getTop20Sites({ limit: 8 });
  const pins = intel.sites.slice(0, 6).map((s, i) => ({
    id: s.id,
    score: s.probabilityScore,
    lng: s.longitude,
    lat: s.latitude,
    hot: i === 0 || s.probabilityScore >= 78,
  }));

  const fallbackPins = [
    { id: "demo", score: 92, lng: -73.9857, lat: 40.7484, hot: true },
    { id: "demo2", score: 84, lng: -73.99, lat: 40.742, hot: false },
    { id: "demo3", score: 79, lng: -73.978, lat: 40.754, hot: false },
  ];

  return (
    <PhoneShell showNav={false} wide>
      <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-white px-5 pb-10 pt-7 md:px-10 md:pb-12 md:pt-9">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse at 70% 20%, rgba(124,58,237,0.12), transparent 45%), radial-gradient(ellipse at 20% 80%, rgba(45,212,191,0.10), transparent 40%), linear-gradient(180deg, #fff 0%, #f8fafc 100%)",
          }}
        />

        <header className="relative z-10 flex items-center justify-between animate-pc-rise">
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-10 w-10" />
            <span className="text-[18px] font-bold tracking-[0.16em] text-pc-ink">
              PROCURITY
            </span>
          </div>
          <Link
            href="/map"
            className="rounded-full bg-pc-mist px-3 py-1.5 text-xs font-bold text-pc-ink"
          >
            Open map
          </Link>
        </header>

        <div className="relative z-10 mt-8 grid flex-1 gap-8 md:mt-10 md:grid-cols-[1.05fr_0.95fr] md:items-center">
          <section className="max-w-xl animate-pc-rise-delay">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-pc-purple">
              Construction intel · NYC
            </p>
            <h1 className="mt-3 text-[2.4rem] font-bold leading-[1.05] tracking-tight text-pc-ink md:text-[3.25rem]">
              Find the next job.{" "}
              <span className="pc-gradient-text">Before</span> they need you.
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-pc-slate md:text-base">
              Live 3D map of high-probability signage opportunities — scored from
              NYC DOB filings so you know who&apos;s ready to buy.
            </p>

            <div className="mt-7 flex flex-wrap gap-3 animate-pc-pop">
              <Link
                href={ctaHref}
                className="pc-gradient-bg inline-flex h-14 min-w-[220px] items-center justify-center rounded-full px-6 text-[16px] font-bold shadow-[0_16px_30px_rgba(124,58,237,0.28)] transition active:scale-[0.98]"
                style={{ color: "#ffffff" }}
              >
                Find My Opportunities
              </Link>
              <Link
                href="/map"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-pc-line bg-white px-5 text-sm font-semibold text-pc-ink"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-pc-mist text-[10px]">
                  ▶
                </span>
                See the 3D map
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 text-[11px] font-semibold text-pc-slate">
              <span className="rounded-full bg-violet-50 px-3 py-1 text-pc-purple">
                Free OpenFreeMap 3D
              </span>
              <span className="rounded-full bg-teal-50 px-3 py-1 text-teal-700">
                Buy-window scores
              </span>
              <span className="rounded-full bg-pc-mist px-3 py-1">
                Top {intel.count || 20} daily
              </span>
            </div>
          </section>

          <div className="relative animate-pc-pop">
            <WelcomeHeroSection
              pins={pins.length ? pins : fallbackPins}
              className="h-[300px] md:h-[420px]"
            />
            <div className="pointer-events-none absolute -right-2 top-8 hidden rounded-2xl bg-white px-3 py-2 text-xs font-bold text-pc-ink shadow-lg md:block">
              Hot pin · visit today
            </div>
          </div>
        </div>
      </main>
    </PhoneShell>
  );
}
