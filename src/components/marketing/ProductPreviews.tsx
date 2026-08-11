"use client";

import { ScoreRing } from "@/components/ui/ScoreRing";
import { cn } from "@/lib/cn";

function PhoneFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[280px] overflow-hidden rounded-[28px] border border-line bg-white shadow-[0_24px_60px_rgba(11,15,25,0.14)]",
        className,
      )}
    >
      <div className="absolute left-1/2 top-2 z-10 h-1 w-16 -translate-x-1/2 rounded-full bg-line" />
      {children}
    </div>
  );
}

export function PreviewWelcome() {
  return (
    <PhoneFrame>
      <div className="bg-offwhite px-4 pb-6 pt-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-purple">
          Good morning
        </p>
        <h3 className="mt-1 text-lg font-bold text-ink">Today&apos;s opportunities</h3>
        <div className="mt-4 flex gap-3 overflow-hidden">
          {[96, 91, 88].map((score) => (
            <div key={score} className="pc-card min-w-[140px] p-3">
              <ScoreRing score={score} size={48} stroke={5} />
              <p className="mt-2 text-xs font-bold text-ink">350 5th Ave</p>
              <p className="text-[10px] text-slate">$15K–$25K</p>
            </div>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}

export function PreviewMap() {
  return (
    <PhoneFrame>
      <div className="relative h-[340px] bg-[#dfe7ef]">
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background:
              "linear-gradient(160deg,#c9d6e3,#e8eef4 40%,#d5e4dc)",
          }}
        />
        {[
          { t: "18%", l: "30%", s: 96, hot: true },
          { t: "42%", l: "58%", s: 84, hot: false },
          { t: "55%", l: "40%", s: 91, hot: true },
        ].map((p) => (
          <div
            key={p.s}
            className={cn(
              "absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold text-white",
              p.hot ? "pc-gradient-bg pc-hot-glow" : "bg-ink",
            )}
            style={{ top: p.t, left: p.l }}
          >
            {p.s}
          </div>
        ))}
        <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-white p-3 shadow-lg">
          <div className="flex items-center gap-3">
            <ScoreRing score={96} size={44} stroke={4} />
            <div>
              <p className="text-sm font-bold text-ink">350 5th Avenue</p>
              <p className="text-[11px] text-slate">Buying window · 2–4 weeks</p>
            </div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

export function PreviewDetail() {
  return (
    <PhoneFrame>
      <div className="bg-white px-4 pb-6 pt-8">
        <div className="flex items-start gap-3">
          <ScoreRing score={96} size={64} />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-hot">
              Hot opportunity
            </p>
            <p className="text-base font-bold text-ink">Lobby + retail fit-out</p>
            <p className="text-xs text-slate">350 5th Avenue, Manhattan</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <span className="rounded-full bg-offwhite px-2.5 py-1 text-[11px] font-bold text-ink">
            $15K–$25K
          </span>
          <span className="rounded-full bg-offwhite px-2.5 py-1 text-[11px] font-bold text-ink">
            2–4 weeks
          </span>
        </div>
        <div className="pc-gradient-bg mt-4 rounded-full py-2.5 text-center text-xs font-bold text-white">
          Add to Pipeline
        </div>
      </div>
    </PhoneFrame>
  );
}

export function PreviewDealWon() {
  return (
    <PhoneFrame>
      <div className="flex h-[340px] flex-col items-center justify-center bg-offwhite px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full pc-gradient-bg text-2xl text-white">
          ✓
        </div>
        <h3 className="mt-4 text-xl font-bold text-ink">Deal Won!</h3>
        <p className="mt-1 text-sm text-slate">350 5th Avenue</p>
        <p className="pc-gradient-text mt-3 text-3xl font-bold tabular-nums">$22,400</p>
      </div>
    </PhoneFrame>
  );
}
