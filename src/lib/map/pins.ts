/**
 * Lightweight map pin queries — only fields the map needs.
 * Supports city + optional viewport bbox so we don't ship every metro on every load.
 * Optional zipCodes filters pins for starter/growth/trial allowlists.
 */

import { isDatabaseConfigured } from "@/lib/db/prisma";
import type { ProjectPhase, ScoreConfidence, TradeScores } from "@/lib/db/types";

export type MapPinRow = {
  id: string;
  city: string;
  latitude: number;
  longitude: number;
  score: number;
  scoreConfidence: ScoreConfidence;
  tradeScores: TradeScores;
  address: string;
  estValueLow: number;
  estValueHigh: number;
  buyingWindowEstimate: string;
  phase: ProjectPhase;
  borough: string | null;
  updatedAt: string;
  zip: string | null;
};

export type MapPinQuery = {
  city?: string;
  /** West, south, east, north (WGS84) */
  bbox?: [number, number, number, number];
  /** Soft cap to protect payloads (viewport queries should stay well under this) */
  limit?: number;
  minScore?: number;
  /**
   * When set (non-empty), only return pins in these zip codes.
   * Callers should pass `allowedZipFilter(user)` — undefined for Pro / empty
   * grandfathered lists (no filter).
   */
  zipCodes?: string[];
};

const DEFAULT_LIMIT = 350;
/** Hard cap — never ship more than this many pins for a viewport. */
const MAX_LIMIT = 400;

function defaultTrades(score: number): TradeScores {
  return {
    signage: score,
    lighting: score,
    glass: score,
    security: score,
    flooring: score,
  };
}

export async function listMapPins(opts: MapPinQuery = {}): Promise<{
  pins: MapPinRow[];
  truncated: boolean;
  totalMatched: number;
}> {
  const limit = Math.min(opts.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

  if (isDatabaseConfigured()) {
    return listMapPinsPrisma(opts, limit);
  }
  return listMapPinsFile(opts, limit);
}

async function listMapPinsFile(opts: MapPinQuery, limit: number) {
  const { listProjects } = await import("@/lib/db/store");
  let items = await listProjects({
    city: opts.city,
    minScore: opts.minScore,
    zipCodes: opts.zipCodes,
  });
  if (opts.bbox) {
    const [w, s, e, n] = opts.bbox;
    items = items.filter(
      (p) =>
        p.longitude >= w &&
        p.longitude <= e &&
        p.latitude >= s &&
        p.latitude <= n,
    );
  }
  // Highest Buy Score first when capping dense viewports
  items = [...items].sort((a, b) => b.score - a.score);
  const totalMatched = items.length;
  const slice = items.slice(0, limit);
  return {
    pins: slice.map((p) => ({
      id: p.id,
      city: p.city,
      latitude: p.latitude,
      longitude: p.longitude,
      score: p.score,
      scoreConfidence: p.scoreConfidence,
      tradeScores: p.tradeScores ?? defaultTrades(p.score),
      address: p.address,
      estValueLow: p.estValueLow,
      estValueHigh: p.estValueHigh,
      buyingWindowEstimate: p.buyingWindowEstimate,
      phase: p.phase,
      borough: p.borough,
      updatedAt: p.updatedAt,
      zip: p.zip,
    })),
    truncated: totalMatched > limit,
    totalMatched,
  };
}

async function listMapPinsPrisma(opts: MapPinQuery, limit: number) {
  const { getPrisma } = await import("@/lib/db/prisma");
  const prisma = getPrisma();
  const where: Record<string, unknown> = {};
  if (opts.city) where.city = opts.city;
  if (opts.minScore) where.score = { gte: opts.minScore };
  if (opts.zipCodes?.length) where.zip = { in: opts.zipCodes };
  if (opts.bbox) {
    const [w, s, e, n] = opts.bbox;
    where.longitude = { gte: w, lte: e };
    where.latitude = { gte: s, lte: n };
  }

  const [totalMatched, rows] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      orderBy: { score: "desc" },
      take: limit,
      select: {
        id: true,
        city: true,
        latitude: true,
        longitude: true,
        score: true,
        scoreConfidence: true,
        tradeScores: true,
        address: true,
        estValueLow: true,
        estValueHigh: true,
        buyingWindowEstimate: true,
        phase: true,
        borough: true,
        updatedAt: true,
        zip: true,
      },
    }),
  ]);

  return {
    pins: rows.map((r) => {
      const score = r.score;
      const tradeScores =
        (r.tradeScores as TradeScores | null) ?? defaultTrades(score);
      return {
        id: r.id,
        city: r.city,
        latitude: r.latitude,
        longitude: r.longitude,
        score,
        scoreConfidence: (r.scoreConfidence as ScoreConfidence) || "medium",
        tradeScores,
        address: r.address,
        estValueLow: r.estValueLow,
        estValueHigh: r.estValueHigh,
        buyingWindowEstimate: r.buyingWindowEstimate,
        phase: r.phase as ProjectPhase,
        borough: r.borough,
        updatedAt: r.updatedAt.toISOString(),
        zip: r.zip,
      };
    }),
    truncated: totalMatched > limit,
    totalMatched,
  };
}
