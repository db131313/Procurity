"use client";

import { scoreModeLabel, type ScoreMode } from "@/components/app/MapFilters";
import { pinColorForScore } from "@/lib/map/pin-filters";

const ROWS = [
  { min: 90, t: "90+ Act now" },
  { min: 80, t: "80–89 Strong" },
  { min: 70, t: "70–79 Solid" },
  { min: 60, t: "60–69 Warm" },
  { min: 0, t: "<60 Watch" },
] as const;

type Props = {
  scoreMode?: ScoreMode;
  className?: string;
  /** Use public blue–violet ramp colors */
  publicRamp?: boolean;
};

/** Buy Score legend — same copy/layout as the logged-in map. */
export function MapPinLegend({
  scoreMode = "general",
  className,
  publicRamp = false,
}: Props) {
  return (
    <div className={className}>
      <div className="pointer-events-auto rounded-2xl border border-line bg-white/95 px-3 py-2.5 text-[11px] shadow-md backdrop-blur">
        <p className="mb-1.5 font-bold text-ink">
          {scoreMode === "general"
            ? "Buy Score"
            : `${scoreModeLabel(scoreMode)} Score`}
        </p>
        <ul className="space-y-1 font-semibold text-slate">
          {ROWS.map((row) => (
            <li key={row.t} className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white"
                style={{
                  background: publicRamp
                    ? publicColor(row.min)
                    : pinColorForScore(row.min === 0 ? 50 : row.min),
                }}
              />
              {row.t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function publicColor(min: number): string {
  if (min >= 90) return "#5B21B6";
  if (min >= 80) return "#6D28D9";
  if (min >= 70) return "#2563EB";
  if (min >= 60) return "#3B82F6";
  return "#93C5FD";
}
