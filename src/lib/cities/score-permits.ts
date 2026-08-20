/**
 * Shared multi-city permit → Project pipeline.
 * Phase estimation + Buy Score + trade scores (same bar as NYC).
 */

import {
  detectPhase,
  scoreProject,
} from "@/lib/scoring/engine";
import { scoreAllTrades } from "@/lib/scoring/trades";
import type { CityCode, Project } from "@/lib/db/types";
import { socrataHelpers } from "@/lib/sources/socrata-generic";

export type RawCityPermit = {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  zip?: string | null;
  borough?: string | null;
  description?: string | null;
  permitType?: string | null;
  workType?: string | null;
  status?: string | null;
  estimatedJobCost?: number | null;
  filingDate?: string | null;
  occupancy?: string | null;
  buildingType?: string | null;
  ownerName?: string | null;
  gcName?: string | null;
  applicantName?: string | null;
  sourceDataset: string;
};

function signalBlob(p: RawCityPermit) {
  return [p.permitType, p.workType, p.description, p.status]
    .filter(Boolean)
    .join(" ");
}

export function estimatePhaseFromPermit(p: RawCityPermit) {
  const blob = signalBlob(p);
  const hasSign = /sign/i.test(blob);
  const hasCO = /certificate of occupanc|\bcof?o\b|c of o/i.test(blob);
  const workTypes = [p.permitType, p.workType, p.description]
    .filter(Boolean)
    .map(String);

  return detectPhase({
    workTypes,
    jobType: p.permitType ?? p.workType,
    hasCO,
    hasSignPermit: hasSign,
    foundation: /new\s*bldg|new\s*building|bldg-new|foundation|structural/i.test(
      blob,
    ),
    mep: /electr|plumb|hvac|mech|fire|sprinkler|mep/i.test(blob),
    interior: /interior|alteration|remodel|finish|tenant/i.test(blob),
  });
}

/** Collapse many permits at the same address into one scored project. */
export function buildScoredProjects(
  city: CityCode,
  permits: RawCityPermit[],
): Project[] {
  const byKey = new Map<string, RawCityPermit[]>();
  for (const p of permits) {
    const key = `${p.address.toLowerCase().trim()}|${p.zip ?? ""}`;
    const list = byKey.get(key) ?? [];
    list.push(p);
    byKey.set(key, list);
  }

  const projects: Project[] = [];
  for (const [, group] of byKey) {
    const primary = [...group].sort((a, b) => {
      const da = a.filingDate ? +new Date(a.filingDate) : 0;
      const db = b.filingDate ? +new Date(b.filingDate) : 0;
      return db - da;
    })[0];

    const phaseInfo = estimatePhaseFromPermit({
      ...primary,
      description: group.map((g) => g.description).filter(Boolean).join(" | "),
      workType: group.map((g) => g.workType || g.permitType).filter(Boolean).join(" "),
    });

    const hasSignPermit = group.some((g) =>
      /sign/i.test(`${g.permitType} ${g.workType} ${g.description}`),
    );
    const cost =
      group
        .map((g) => g.estimatedJobCost)
        .filter((n): n is number => n != null && n > 0)
        .sort((a, b) => b - a)[0] ?? null;

    const scored = scoreProject({
      phase: phaseInfo.phase,
      lastActivityAt: primary.filingDate ?? null,
      estimatedJobCost: cost,
      occupancy: primary.occupancy ?? null,
      buildingType: primary.buildingType ?? primary.permitType ?? null,
      gcName: primary.gcName ?? null,
      architectName: null,
      hasSignPermit,
      jobType: primary.permitType ?? primary.workType ?? null,
    });

    const tradeScores = scoreAllTrades({
      phase: phaseInfo.phase,
      lastActivityAt: primary.filingDate ?? null,
      estimatedJobCost: cost,
      occupancy: primary.occupancy ?? null,
      buildingType: primary.buildingType ?? primary.permitType ?? null,
      gcName: primary.gcName ?? null,
      architectName: null,
      hasSignPermit,
      jobType: primary.permitType ?? primary.workType ?? null,
    });

    const base = socrataHelpers.baseProject({
      id: `${city}-${primary.id}`,
      city,
      address: primary.address,
      latitude: primary.latitude,
      longitude: primary.longitude,
      zip: primary.zip ?? null,
      borough: primary.borough ?? null,
      description: primary.description ?? null,
      estimatedJobCost: cost,
      filingDate: primary.filingDate ?? null,
      jobNumber: primary.id,
      sourceDataset: primary.sourceDataset,
      score: scored.score,
      scoreConfidence: scored.scoreConfidence,
    });

    projects.push({
      ...base,
      phase: phaseInfo.phase,
      phaseConfidence: phaseInfo.confidence,
      score: scored.score,
      scoreConfidence: scored.scoreConfidence,
      scoreReasons: [
        ...phaseInfo.reasons.slice(0, 2),
        ...scored.scoreReasons.slice(0, 4),
      ],
      tradeScores,
      estValueLow: scored.estValueLow,
      estValueHigh: scored.estValueHigh,
      buyingWindowEstimate: scored.buyingWindowEstimate,
      occupancy: primary.occupancy ?? null,
      buildingType: primary.buildingType ?? null,
      jobType: primary.permitType ?? primary.workType ?? null,
      ownerName: primary.ownerName ?? null,
      gcName: primary.gcName ?? null,
      filerName: primary.applicantName ?? null,
      hasSignPermit,
    });
  }

  return projects.sort((a, b) => b.score - a.score);
}
