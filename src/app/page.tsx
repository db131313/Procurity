import Link from "next/link";
import { LogoMark } from "@/components/mobile/Logo";
import { PhoneShell } from "@/components/mobile/PhoneShell";
import { auth } from "@/lib/auth";

export default async function WelcomePage() {
  const session = await auth();
  const ctaHref = session?.user ? "/map" : "/signin";

  return (
    <PhoneShell showNav={false}>
      <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-white px-6 pb-10 pt-8">
        <div
          className="pointer-events-none absolute inset-x-0 top-[42%] h-[48%] opacity-90"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.10), transparent 55%), linear-gradient(180deg, #fff 0%, #f8fafc 100%)",
          }}
        />
        {/* stylized city silhouette */}
        <div
          className="pointer-events-none absolute inset-x-[-10%] bottom-[22%] h-[34%] opacity-95"
          aria-hidden
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 280'%3E%3Cg fill='%23eef2ff'%3E%3Crect x='40' y='120' width='50' height='160'/%3E%3Crect x='100' y='80' width='70' height='200'/%3E%3Crect x='180' y='140' width='45' height='140'/%3E%3Crect x='235' y='60' width='90' height='220'/%3E%3Crect x='340' y='100' width='60' height='180'/%3E%3Crect x='415' y='40' width='110' height='240'/%3E%3Crect x='540' y='90' width='70' height='190'/%3E%3Crect x='625' y='130' width='50' height='150'/%3E%3Crect x='690' y='70' width='80' height='210'/%3E%3C/g%3E%3Crect x='430' y='70' width='40' height='40' rx='8' fill='%238b5cf6'/%3E%3C/svg%3E")`,
            backgroundSize: "cover",
            backgroundPosition: "center bottom",
          }}
        />

        <header className="relative z-10 animate-pc-rise">
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-10 w-10" />
            <span className="text-[18px] font-bold tracking-[0.16em] text-pc-ink">
              PROCURITY
            </span>
          </div>
        </header>

        <section className="relative z-10 mt-14 max-w-[20rem] animate-pc-rise-delay">
          <h1 className="text-[2.35rem] font-bold leading-[1.05] tracking-tight text-pc-ink">
            Find the next job.{" "}
            <span className="pc-gradient-text">Before</span> they need you.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-pc-slate">
            Turn NYC construction activity into high-probability signage
            opportunities — ranked for who&apos;s ready to buy.
          </p>
        </section>

        <div className="relative z-10 mt-auto space-y-4 pt-16 animate-pc-pop">
          <Link
            href={ctaHref}
            className="pc-gradient-bg flex h-14 items-center justify-center rounded-full text-[16px] font-bold shadow-[0_16px_30px_rgba(124,58,237,0.28)] transition active:scale-[0.98]"
            style={{ color: "#ffffff" }}
          >
            Find My Opportunities
          </Link>
          <Link
            href="/map"
            className="flex items-center justify-center gap-2 text-sm font-semibold text-pc-slate"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-pc-mist">
              ▶
            </span>
            See how it works
          </Link>
        </div>
      </main>
    </PhoneShell>
  );
}
