/**
 * Configurable Buy Score rules engine (0–100).
 * Weights can be tuned without rewriting phase/recency logic.
 */

import { differenceInCalendarDays, parseISO } from "date-fns";
import type { ProjectPhase } from "@/lib/db/types";

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

export type ScoringResult = {
  score: number;
  estValueLow: number;
  estValueHigh: number;
  buyingWindowEstimate: string;
  scoreReasons: string[];
  phaseConfidence: number;
};

const PHASE_BASE: Record<ProjectPhase, number> = {
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
  return Math.round(Math.max(min, Math.min(max, n)));
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
  if (/resid|dwell|apt|condo|1-2|1\s*&\s*2|family/i.test(hay) && !/mixed|commercial|retail|store|hotel|restaurant/i.test(hay)) {
    return false;
  }
  return /commercial|retail|store|restaurant|hotel|office|mixed|merc|public/i.test(hay) || !hay.trim();
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
  return [Math.round(mid * 0.7 / 1000) * 1000, Math.round(mid * 1.35 / 1000) * 1000];
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
  const hasSG = signals.hasSignPermit || wt.includes("SG") || wt.some((w) => /SIGN/.test(w));
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

export function scoreProject(
  input: ScoringInput,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
): ScoringResult {
  const reasons: string[] = [];
  const phaseScore = PHASE_BASE[input.phase];
  reasons.push(
    `Phase fit: ${input.phase.replace(/_/g, " ")} (+${phaseScore} base)`,
  );

  const activity = parseDate(input.lastActivityAt);
  const days = activity
    ? differenceInCalendarDays(new Date(), activity)
    : 90;
  let recencyScore = 40;
  if (days <= 7) {
    recencyScore = 95;
    reasons.push("Permit activity in the last 7 days");
  } else if (days <= 14) {
    recencyScore = 85;
    reasons.push("Permit activity in the last 14 days");
  } else if (days <= 30) {
    recencyScore = 70;
    reasons.push("Activity within 30 days");
  } else if (days <= 60) {
    recencyScore = 50;
  } else {
    recencyScore = 28;
    reasons.push("No recent activity (>60 days) — score decayed");
  }

  const cost = input.estimatedJobCost ?? 0;
  let sizeScore = 35;
  if (cost >= 10_000_000) {
    sizeScore = 95;
    reasons.push("Large project ($10M+) — earlier / bigger signage budgets");
  } else if (cost >= 2_000_000) {
    sizeScore = 80;
    reasons.push("Substantial job cost ($2M+)");
  } else if (cost >= 500_000) {
    sizeScore = 65;
  } else if (cost >= 100_000) {
    sizeScore = 50;
  }

  const commercial = isCommercial(input.occupancy, input.buildingType);
  const occupancyScore = commercial ? 82 : 45;
  reasons.push(
    commercial
      ? "Commercial / retail / mixed-use classification"
      : "Primarily residential — lower base priority",
  );

  let filerScore = 35;
  if (input.gcName) {
    filerScore += 35;
    reasons.push(`GC identified: ${input.gcName}`);
  }
  if (input.architectName) {
    filerScore += 25;
    reasons.push(`Architect of record: ${input.architectName}`);
  }
  filerScore = Math.min(100, filerScore);

  let competitiveScore = 90;
  if (input.hasSignPermit) {
    competitiveScore = 35;
    reasons.push(
      "Sign permit already filed — lower new-opportunity score; check uncovered scope",
    );
  } else {
    reasons.push("No competing sign permit detected");
  }

  const raw =
    phaseScore * weights.phaseFit +
    recencyScore * weights.recency +
    sizeScore * weights.projectSize +
    occupancyScore * weights.occupancy +
    filerScore * weights.filerSignal +
    competitiveScore * weights.competitive;

  // Soft floors so peak buying windows land in the green 90+ band
  let score = clamp(raw);
  const peakPhase =
    input.phase === "interior_finishing" || input.phase === "sign_ready";
  if (peakPhase && commercial && days <= 14 && (input.gcName || input.architectName)) {
    score = Math.max(score, 92);
  } else if (peakPhase && commercial && days <= 21) {
    score = Math.max(score, 90);
  } else if (peakPhase && commercial && days <= 45) {
    score = Math.max(score, 82);
  } else if (peakPhase && days <= 30) {
    score = Math.max(score, 78);
  }

  const [estValueLow, estValueHigh] = valueBand(input.estimatedJobCost, input.phase);

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
  };
}

/** Heuristic product recommendations — not literal DOB data. */
export function recommendSolutions(
  phase: ProjectPhase,
  occupancy: string | null,
): { name: string; probability: string; blurb: string }[] {
  const commercial = isCommercial(occupancy, null);
  const base = [
    {
      name: "Exterior identity signage",
      probability: phase === "sign_ready" || phase === "interior_finishing" ? "High" : "Medium",
      blurb: "Facade, blade, and primary brand marks as the shell completes.",
    },
    {
      name: "Interior wayfinding",
      probability: phase === "interior_finishing" ? "High" : "Medium",
      blurb: "Directory, suite, and elevator IDs during finishing.",
    },
    {
      name: "ADA / code-required signs",
      probability: "High",
      blurb: "Restroom, egress, and accessibility plaques before CO.",
    },
    {
      name: commercial ? "Storefront / awning" : "Lobby directory",
      probability: commercial && phase !== "foundation_structure" ? "High" : "Low",
      blurb: commercial
        ? "Retail frontage graphics timed with glazing and fit-out."
        : "Residential lobby branding as units near finish.",
    },
  ];
  return base;
}
