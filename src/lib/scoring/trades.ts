/**
 * Config-driven trade phase-fit weights + multi-trade scoring.
 * Reuses shared score factors via scoreProjectWithPhaseFit.
 */

import type { ProjectPhase, TradeScores } from "@/lib/db/types";
import {
  scoreProjectWithPhaseFit,
  type ScoringInput,
  type ScoringWeights,
  DEFAULT_WEIGHTS,
  SIGNAGE_PHASE_FIT,
} from "./engine";

export type TradeKey = keyof TradeScores;

/** Signage: peak at interior_finishing + sign_ready (default Buy Score). */
export const TRADE_PHASE_FIT: Record<TradeKey, Record<ProjectPhase, number>> = {
  signage: SIGNAGE_PHASE_FIT,
  /** Lighting: highest mep + interior_finishing */
  lighting: {
    pre_construction: 32,
    foundation_structure: 42,
    mep: 96,
    interior_finishing: 94,
    sign_ready: 68,
    signage_filed: 40,
  },
  /** Glass: highest foundation_structure / early interior_finishing */
  glass: {
    pre_construction: 48,
    foundation_structure: 96,
    mep: 78,
    interior_finishing: 88,
    sign_ready: 52,
    signage_filed: 36,
  },
  /** Security: mep + interior_finishing */
  security: {
    pre_construction: 34,
    foundation_structure: 44,
    mep: 94,
    interior_finishing: 96,
    sign_ready: 70,
    signage_filed: 42,
  },
  /** Flooring: late interior_finishing + sign_ready */
  flooring: {
    pre_construction: 24,
    foundation_structure: 30,
    mep: 48,
    interior_finishing: 96,
    sign_ready: 94,
    signage_filed: 44,
  },
};

export function scoreTrade(
  trade: TradeKey,
  input: ScoringInput,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
): number {
  return scoreProjectWithPhaseFit(input, TRADE_PHASE_FIT[trade], weights).score;
}

export function scoreAllTrades(
  input: ScoringInput,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
): TradeScores {
  return {
    signage: scoreTrade("signage", input, weights),
    lighting: scoreTrade("lighting", input, weights),
    glass: scoreTrade("glass", input, weights),
    security: scoreTrade("security", input, weights),
    flooring: scoreTrade("flooring", input, weights),
  };
}
