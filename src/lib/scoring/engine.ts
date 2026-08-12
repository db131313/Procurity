/**
 * Configurable Buy Score rules engine (0–100).
 * Missing factors are excluded and weights renormalized — never filled with placeholders.
 */

import { differenceInCalendarDays, parseISO } from "date-fns";
import type { ProjectPhase, ScoreConfidence } from "@/lib/db/types";

export type ScoringWeights = {
  phaseFit: number;
  recency: number;
  projectSize: number;
  occupancy: number;
  filerSignal: number;
  competitive: number;
};

export const DEFAULT_WEIGHTS: ScoringWeights = {
  phaseFit: 0.38,
  recency: 0.18,
  projectSize: 0.16,
  occupancy: 0.12,
  filerSignal: 0.1,
  competitive: 0.06,
};

export type ScoringInput = {
  phase: ProjectPhase;
  lastActivityAt: string | null;
  estimatedJobCost: number | null;
  occupancy: string | null;
  buildingType: string | null;
  gcName: string | null;
  architectName: string | null;
  hasSignPermit: boolean;
  jobType: string | null;
};

export type FactorBreakdown = {
  key: keyof ScoringWeights;
  available: boolean;
  rawScore: number | null;
  weight: number;
  weighted: number;
  note: string;
};

export type ScoringResult = {
  score: number;
  estValueLow: number;
  estValueHigh: number;
  buyingWindowEstimate: string;
  scoreReasons: string[];
  phaseConfidence: number;
  scoreConfidence: ScoreConfidence;
  factorsAvailable: number;
  factorsTotal: number;
  factorBreakdown: FactorBreakdown[];
};

/** Default signage phase-fit (interior_finishing + sign_ready highest). */
export const SIGNAGE_PHASE_FIT: Record<ProjectPhase, number> = {
  pre_construction: 38,
  foundation_structure: 48,
  mep: 72,
  interior_finishing: 96,
  sign_ready: 94,
  signage_filed: 52,
};

const PHASE_WINDOW: Record<ProjectPhase, string> = {
  pre_construction: "8–16 weeks",
  foundation_structure: "6–12 weeks",
  mep: "4–8 weeks",
  interior_finishing: "2–4 weeks",
  sign_ready: "1–3 weeks",
  signage_filed: "Check scope overlap",
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function parseDate(value?: string | null) {
  if (!value) return null;
  try {
    return parseISO(value.slice(0, 10));
  } catch {
    return null;
  }
}

function isCommercial(occupancy?: string | null, buildingType?: string | null) {
  const hay = `${occupancy ?? ""} ${buildingType ?? ""}`.toLowerCase();
  if (
    /resid|dwell|apt|condo|1-2|1\s*&\s*2|family/i.test(hay) &&
    !/mixed|commercial|retail|store|hotel|restaurant/i.test(hay)
  ) {
    return false;
  }
  return /commercial|retail|store|restaurant|hotel|office|mixed|merc|public/i.test(
    hay,
  );
}

function hasOccupancySignal(occupancy?: string | null, buildingType?: string | null) {
  return Boolean(`${occupancy ?? ""}${buildingType ?? ""}`.trim());
}

function valueBand(cost: number | null, phase: ProjectPhase): [number, number] {
  const base = cost && cost > 0 ? cost * 0.012 : 18000;
  const mult =
    phase === "interior_finishing" || phase === "sign_ready"
      ? 1.25
      : phase === "mep"
        ? 1.05
        : 0.85;
  const mid = Math.max(5000, base * mult);
  return [
    Math.round((mid * 0.7) / 1000) * 1000,
    Math.round((mid * 1.35) / 1000) * 1000,
  ];
}

/** Smooth recency: ~100 at day 0, ~50 at ~32d, ~20 at ~90d. */
export function recencyScoreContinuous(days: number): number {
  return clamp(12 + 88 * Math.exp(-days / 32));
}

/** Continuous log-scaled size from estimated job cost. */
export function sizeScoreContinuous(cost: number): number {
  const c = Math.max(1, cost);
  // $25k ≈ 28, $250k ≈ 48, $2.5M ≈ 68, $25M ≈ 88
  const t = Math.log10(c) / Math.log10(50_000_000);
  return clamp(18 + 82 * Math.min(1, Math.max(0, t)));
}

export function confidenceFromCoverage(available: number, total: number): ScoreConfidence {
  const ratio = total > 0 ? available / total : 0;
  if (ratio >= 0.75) return "high";
  if (ratio >= 0.45) return "medium";
  return "low";
}

export function detectPhase(signals: {
  workTypes: string[];
  jobType?: string | null;
  hasCO?: boolean;
  hasSignPermit?: boolean;
  foundation?: boolean;
  mep?: boolean;
  interior?: boolean;
}): { phase: ProjectPhase; confidence: number; reasons: string[] } {
  const reasons: string[] = [];
  const wt = signals.workTypes.map((w) => w.toUpperCase());
  const hasSG =
    signals.hasSignPermit ||
    wt.includes("SG") ||
    wt.some((w) => /SIGN/.test(w));
  const hasFoundation =
    signals.foundation ||
    wt.some((w) => /FO|FOUND|EXCAV|STRUCT|EQ/.test(w));
  const hasMep =
    signals.mep || wt.some((w) => /PL|MH|EL|SP|FA|MECH|PLUMB|ELECT/.test(w));
  const hasInterior =
    signals.interior ||
    wt.some((w) => /FA|SP|INT|ALT-?2|ALT-?3/.test(w)) ||
    /alt-?2|alt-?3|interior/i.test(signals.jobType ?? "");

  if (hasSG) {
    reasons.push("Sign permit (SG) detected at this BIN");
    return { phase: "signage_filed", confidence: 0.9, reasons };
  }
  if (signals.hasCO) {
    reasons.push("Certificate of Occupancy activity — near completion");
    return { phase: "sign_ready", confidence: 0.85, reasons };
  }
  if (hasInterior && hasMep) {
    reasons.push("Interior + MEP activity — peak signage buying window");
    return { phase: "interior_finishing", confidence: 0.82, reasons };
  }
  if (hasInterior) {
    reasons.push("Interior alteration / finishing permits active");
    return { phase: "interior_finishing", confidence: 0.78, reasons };
  }
  if (hasMep) {
    reasons.push("MEP work types active (PL / MH / EL / FA)");
    return { phase: "mep", confidence: 0.75, reasons };
  }
  if (hasFoundation || /new building|nb\b/i.test(signals.jobType ?? "")) {
    reasons.push("Foundation / structure or new building signals");
    return { phase: "foundation_structure", confidence: 0.7, reasons };
  }
  reasons.push("Initial filing — pre-construction");
  return { phase: "pre_construction", confidence: 0.55, reasons };
}

/**
 * Shared scorer. Missing inputs are excluded; weights renormalize over available factors.
 * No soft floors / placeholder defaults that cluster scores.
 */
export function scoreProjectWithPhaseFit(
  input: ScoringInput,
  phaseFitOverride: Record<ProjectPhase, number> = SIGNAGE_PHASE_FIT,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
  opts: { collectReasons?: boolean } = {},
): ScoringResult {
  const collectReasons = opts.collectReasons ?? true;
  const reasons: string[] = [];
  const breakdown: FactorBreakdown[] = [];

  const phaseScore = phaseFitOverride[input.phase];
  if (collectReasons) {
    reasons.push(
      `Phase fit: ${input.phase.replace(/_/g, " ")} (${phaseScore.toFixed(0)})`,
    );
  }
  breakdown.push({
    key: "phaseFit",
    available: true,
    rawScore: phaseScore,
    weight: weights.phaseFit,
    weighted: 0,
    note: `Phase ${input.phase}`,
  });

  const activity = parseDate(input.lastActivityAt);
  if (activity) {
    const days = Math.max(
      0,
      differenceInCalendarDays(new Date(), activity),
    );
    const recencyScore = recencyScoreContinuous(days);
    if (collectReasons) {
      reasons.push(
        `Recency: activity ${days}d ago → ${recencyScore.toFixed(1)}`,
      );
    }
    breakdown.push({
      key: "recency",
      available: true,
      rawScore: recencyScore,
      weight: weights.recency,
      weighted: 0,
      note: `${days} days since activity`,
    });
  } else {
    breakdown.push({
      key: "recency",
      available: false,
      rawScore: null,
      weight: weights.recency,
      weighted: 0,
      note: "No filing/activity date — excluded",
    });
  }

  const cost =
    input.estimatedJobCost && input.estimatedJobCost > 0
      ? input.estimatedJobCost
      : null;
  if (cost != null) {
    const sizeScore = sizeScoreContinuous(cost);
    if (collectReasons) {
      reasons.push(
        `Project size: $${Math.round(cost).toLocaleString()} → ${sizeScore.toFixed(1)}`,
      );
    }
    breakdown.push({
      key: "projectSize",
      available: true,
      rawScore: sizeScore,
      weight: weights.projectSize,
      weighted: 0,
      note: `Job cost $${Math.round(cost).toLocaleString()}`,
    });
  } else {
    breakdown.push({
      key: "projectSize",
      available: false,
      rawScore: null,
      weight: weights.projectSize,
      weighted: 0,
      note: "No estimated job cost — excluded",
    });
  }

  if (hasOccupancySignal(input.occupancy, input.buildingType)) {
    const commercial = isCommercial(input.occupancy, input.buildingType);
    // Continuous-ish: commercial high, residential lower, mixed mid via hay match
    const hay = `${input.occupancy ?? ""} ${input.buildingType ?? ""}`.toLowerCase();
    let occupancyScore = commercial ? 84 : 42;
    if (/mixed/i.test(hay)) occupancyScore = 70;
    if (/hotel|hospital|school|public/i.test(hay)) occupancyScore = 88;
    if (collectReasons) {
      reasons.push(
        commercial
          ? "Commercial / retail / mixed-use classification"
          : "Primarily residential — lower base priority",
      );
    }
    breakdown.push({
      key: "occupancy",
      available: true,
      rawScore: occupancyScore,
      weight: weights.occupancy,
      weighted: 0,
      note: commercial ? "commercial-leaning" : "residential-leaning",
    });
  } else {
    breakdown.push({
      key: "occupancy",
      available: false,
      rawScore: null,
      weight: weights.occupancy,
      weighted: 0,
      note: "No occupancy/building type — excluded",
    });
  }

  if (input.gcName || input.architectName) {
    let filerScore = 40;
    if (input.gcName) filerScore += 32;
    if (input.architectName) filerScore += 24;
    filerScore = Math.min(100, filerScore);
    if (collectReasons) {
      if (input.gcName) reasons.push(`GC identified: ${input.gcName}`);
      if (input.architectName) {
        reasons.push(`Architect of record: ${input.architectName}`);
      }
    }
    breakdown.push({
      key: "filerSignal",
      available: true,
      rawScore: filerScore,
      weight: weights.filerSignal,
      weighted: 0,
      note: [input.gcName && "GC", input.architectName && "architect"]
        .filter(Boolean)
        .join("+"),
    });
  } else {
    breakdown.push({
      key: "filerSignal",
      available: false,
      rawScore: null,
      weight: weights.filerSignal,
      weighted: 0,
      note: "No GC/architect — excluded",
    });
  }

  const competitiveScore = input.hasSignPermit ? 34 : 91;
  if (collectReasons) {
    reasons.push(
      input.hasSignPermit
        ? "Sign permit already filed — lower new-opportunity score"
        : "No competing sign permit detected",
    );
  }
  breakdown.push({
    key: "competitive",
    available: true,
    rawScore: competitiveScore,
    weight: weights.competitive,
    weighted: 0,
    note: input.hasSignPermit ? "SG present" : "no SG",
  });

  const available = breakdown.filter((f) => f.available && f.rawScore != null);
  const weightSum = available.reduce((s, f) => s + f.weight, 0) || 1;

  let raw = 0;
  for (const f of breakdown) {
    if (!f.available || f.rawScore == null) continue;
    const w = f.weight / weightSum;
    f.weighted = f.rawScore * w;
    raw += f.weighted;
  }

  // Preserve fractional spread; round only once at the end
  const score = Math.round(clamp(raw));

  const factorsAvailable = available.length;
  const factorsTotal = breakdown.length;
  const scoreConfidence = confidenceFromCoverage(
    factorsAvailable,
    factorsTotal,
  );

  if (collectReasons) {
    reasons.push(
      `Confidence: ${scoreConfidence} (${factorsAvailable}/${factorsTotal} factors with data)`,
    );
  }

  const [estValueLow, estValueHigh] = valueBand(
    input.estimatedJobCost,
    input.phase,
  );

  return {
    score,
    estValueLow,
    estValueHigh,
    buyingWindowEstimate: PHASE_WINDOW[input.phase],
    scoreReasons: reasons,
    phaseConfidence:
      input.phase === "interior_finishing" || input.phase === "sign_ready"
        ? 0.8
        : 0.65,
    scoreConfidence,
    factorsAvailable,
    factorsTotal,
    factorBreakdown: breakdown,
  };
}

export function scoreProject(
  input: ScoringInput,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
): ScoringResult {
  return scoreProjectWithPhaseFit(input, SIGNAGE_PHASE_FIT, weights);
}

export type SourcingRecommendation = {
  trade: string;
  score: number;
  reason: string;
};

const TRADE_LABELS: Record<string, string> = {
  signage: "Signage",
  lighting: "Lighting",
  glass: "Glass",
  security: "Security cameras",
  flooring: "Flooring",
};

/**
 * Per-project sourcing recommendations from trade_scores (thresholded).
 * Replaces the old static recommendSolutions list.
 */
export function recommendSourcing(input: {
  tradeScores: Record<string, number>;
  phase: ProjectPhase;
  lastActivityAt?: string | null;
  scoreReasons?: string[];
  threshold?: number;
}): SourcingRecommendation[] {
  const threshold = input.threshold ?? 60;
  const activity = parseDate(input.lastActivityAt ?? null);
  const days = activity
    ? Math.max(0, differenceInCalendarDays(new Date(), activity))
    : null;

  const phaseHint = input.phase.replace(/_/g, " ");
  const recencyHint =
    days != null
      ? days <= 7
        ? "filed/active this week"
        : days <= 30
          ? `activity ${days}d ago`
          : `last activity ${days}d ago`
      : phaseHint;

  const rows = Object.entries(input.tradeScores)
    .map(([trade, score]) => ({
      trade,
      score,
      reason: `${TRADE_LABELS[trade] ?? trade} fits ${phaseHint} · ${recencyHint}`,
    }))
    .filter((r) => r.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .map((r) => ({
      trade: TRADE_LABELS[r.trade] ?? r.trade,
      score: r.score,
      reason: r.reason,
    }));

  return rows;
}

/** @deprecated Use recommendSourcing — kept temporarily for any leftover imports. */
export function recommendSolutions(
  phase: ProjectPhase,
  _occupancy: string | null,
): { name: string; probability: string; blurb: string }[] {
  void phase;
  return [];
}
