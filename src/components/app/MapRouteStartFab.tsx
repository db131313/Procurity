"use client";

import { useState } from "react";
import { Navigation } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  /** Google Maps directions URL (multi-stop or single). */
  mapsUrl: string | null;
  stopCount: number;
};

/**
 * Floating Start control — stays on our map until the user intentionally
 * hands off to Google Maps turn-by-turn.
 */
export function MapRouteStartFab({ mapsUrl, stopCount }: Props) {
  const [handingOff, setHandingOff] = useState(false);

  if (!mapsUrl || stopCount < 1) return null;

  function start() {
    if (handingOff || !mapsUrl) return;
    setHandingOff(true);
    window.setTimeout(() => {
      window.open(mapsUrl, "_blank", "noopener,noreferrer");
      window.setTimeout(() => setHandingOff(false), 400);
    }, 700);
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[calc(5.5rem+var(--safe-bottom))] z-40 flex justify-center md:bottom-8">
      <button
        type="button"
        onClick={start}
        disabled={handingOff}
        className={cn(
          "pointer-events-auto flex h-14 min-w-[12rem] items-center justify-center gap-2 rounded-full px-7 text-sm font-bold text-white shadow-[0_12px_28px_rgba(17,24,39,0.28)] transition active:scale-[0.98] disabled:opacity-90",
          handingOff ? "bg-ink" : "pc-gradient-bg",
        )}
      >
        <Navigation
          className={cn("h-4 w-4", handingOff && "animate-pulse")}
          aria-hidden
        />
        {handingOff
          ? "Opening turn-by-turn…"
          : stopCount === 1
            ? "Start"
            : `Start · ${stopCount} stops`}
      </button>
    </div>
  );
}
