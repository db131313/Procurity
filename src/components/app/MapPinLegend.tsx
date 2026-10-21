"use client";

import { scoreModeLabel, type ScoreMode } from "@/components/app/MapFilters";
import { pinColorForScore, pinColorForScorePublic } from "@/lib/map/pin-filters";
import { cn } from "@/lib/cn";

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
  /** Use public construction heat ramp */
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
      <div
        className={cn(
          "pointer-events-auto rounded-xl border px-3 py-2.5 text-[11px]",
          publicRamp
            ? "border-[#E7DFD0] bg-[#FBF7F0]/95 text-[#5B6475]"
            : "border-line bg-white/95 text-slate shadow-md",
        )}
      >
        <p
          className={cn(
            "mb-1.5 font-semibold",
            publicRamp ? "text-[#14213D]" : "font-bold text-ink",
          )}
        >
          {scoreMode === "general"
            ? "Buy Score"
            : `${scoreModeLabel(scoreMode)} Score`}
        </p>
        <ul className="space-y-1 font-medium">
          {ROWS.map((row) => (
            <li key={row.t} className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{
                  background: publicRamp
                    ? pinColorForScorePublic(row.min === 0 ? 50 : row.min)
                    : pinColorForScore(row.min === 0 ? 50 : row.min),
                  boxShadow: publicRamp
                    ? `0 0 0 1px #E7DFD0`
                    : "0 0 0 2px #fff",
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
