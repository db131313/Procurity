import type {
  MapFilterState,
  ScoreMode,
} from "@/components/app/MapFilters";
import type { ProjectPhase, TradeScores } from "@/lib/db/types";

/** Minimal project shape needed for client-side map filtering / coloring. */
export type FilterablePin = {
  id: string;
  latitude: number;
  longitude: number;
  score: number;
  phase: ProjectPhase | string;
  tradeScores?: TradeScores | null;
  updatedAt?: string | null;
  projectType?: string | null;
  city?: string;
};

export function pinColorForScore(score: number): string {
  if (score >= 90) return "#16A34A";
  if (score >= 80) return "#0D9488";
  if (score >= 70) return "#2563EB";
  if (score >= 60) return "#D97706";
  return "#64748B";
}

/** Public home map: blue → violet ramp (still readable on light tiles). */
export function pinColorForScorePublic(score: number): string {
  if (score >= 90) return "#5B21B6";
  if (score >= 80) return "#6D28D9";
  if (score >= 70) return "#2563EB";
  if (score >= 60) return "#3B82F6";
  return "#93C5FD";
}

function tradeScoresFor(p: FilterablePin): TradeScores {
  if (p.tradeScores) return p.tradeScores;
  const s = p.score;
  return {
    signage: s,
    lighting: s,
    glass: s,
    security: s,
    flooring: s,
  };
}

export function effectivePinScore(
  p: FilterablePin,
  scoreMode: ScoreMode,
): number {
  if (scoreMode === "general") return p.score;
  const scores = tradeScoresFor(p);
  return scores[scoreMode] ?? p.score;
}

export function matchesQuick(
  p: FilterablePin,
  score: number,
  quick: MapFilterState["quick"],
): boolean {
  if (quick === "all") return true;
  if (quick === "hot") return score >= 85;
  if (quick === "buying") {
    return (
      p.phase === "interior_finishing" ||
      p.phase === "sign_ready" ||
      score >= 80
    );
  }
  if (quick === "new") {
    if (!p.updatedAt) return false;
    return new Date(p.updatedAt).getTime() >= Date.now() - 7 * 86400000;
  }
  return true;
}

export function matchesScorePreset(
  score: number,
  preset: MapFilterState["scorePreset"],
): boolean {
  if (preset === "all") return true;
  if (preset === "90+") return score >= 90;
  if (preset === "70-89") return score >= 70 && score <= 89;
  if (preset === "50-69") return score >= 50 && score <= 69;
  return true;
}

export function filterPins(
  pins: FilterablePin[],
  filters: MapFilterState,
): Array<FilterablePin & { displayScore: number; color: string }> {
  const out: Array<FilterablePin & { displayScore: number; color: string }> =
    [];
  for (const p of pins) {
    const score = effectivePinScore(p, filters.scoreMode);
    if (!matchesQuick(p, score, filters.quick)) continue;
    if (!matchesScorePreset(score, filters.scorePreset)) continue;
    out.push({
      ...p,
      displayScore: score,
      color: pinColorForScore(score),
    });
  }
  return out;
}
