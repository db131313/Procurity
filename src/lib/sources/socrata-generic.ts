/**
 * Generic Socrata Open Data adapter for US city permit feeds.
 * Cities wire a dataset URL + row mapper; no fabricated permits.
 */

import type { CityCode, Project, ScoreConfidence, TradeScores } from "@/lib/db/types";
import type {
  DataSource,
  DataSourceFetchOptions,
  DataSourceMeta,
  SourceCoverageStatus,
} from "./types";

export type SocrataRow = Record<string, unknown>;

export type SocrataCityConfig = {
  id: CityCode;
  name: string;
  county: string;
  state: string;
  /** Public Socrata resource URL, e.g. https://data.cityofchicago.org/resource/ydr8-5enu.json */
  resourceUrl: string;
  /** Optional app token env var name override (defaults to SOCRATA_APP_TOKEN). */
  tokenEnv?: string;
  description: string;
  /** Map a raw Socrata row → Project, or null to skip. */
  mapRow: (row: SocrataRow, city: CityCode) => Project | null;
  /** Query params always applied (e.g. $limit, $where template). */
  defaultParams?: Record<string, string>;
};

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Shared helpers for city mappers. */
export const socrataHelpers = {
  str,
  num,
  emptyTrades(score = 0): TradeScores {
    return {
      signage: score,
      lighting: score,
      glass: score,
      security: score,
      flooring: score,
    };
  },
  baseProject(partial: {
    id: string;
    city: CityCode;
    address: string;
    latitude: number;
    longitude: number;
    jobNumber?: string | null;
    zip?: string | null;
    borough?: string | null;
    description?: string | null;
    estimatedJobCost?: number | null;
    filingDate?: string | null;
    sourceDataset: string;
    score?: number;
    scoreConfidence?: ScoreConfidence;
  }): Project {
    const now = new Date().toISOString();
    const score = partial.score ?? 40;
    return {
      id: partial.id,
      city: partial.city,
      bin: null,
      jobNumber: partial.jobNumber ?? partial.id,
      address: partial.address,
      borough: partial.borough ?? null,
      zip: partial.zip ?? null,
      latitude: partial.latitude,
      longitude: partial.longitude,
      jobType: null,
      buildingType: null,
      occupancy: null,
      description: partial.description ?? null,
      estimatedJobCost: partial.estimatedJobCost ?? null,
      phase: "pre_construction",
      phaseConfidence: 0.3,
      score,
      scoreConfidence: partial.scoreConfidence ?? "low",
      scoreReasons: ["Imported from open permit feed — scoring pending city rules"],
      tradeScores: socrataHelpers.emptyTrades(score),
      estValueLow: 0,
      estValueHigh: 0,
      buyingWindowEstimate: "Unknown",
      gcName: null,
      architectName: null,
      architectFirm: null,
      architectPhone: null,
      architectEmail: null,
      architectWebsite: null,
      architectLicense: null,
      engineerName: null,
      engineerFirm: null,
      engineerPhone: null,
      engineerEmail: null,
      engineerWebsite: null,
      engineerLicense: null,
      ownerName: null,
      filerName: null,
      filerFirm: null,
      hasSignPermit: false,
      lastActivityAt: partial.filingDate ?? now,
      filingDate: partial.filingDate ?? null,
      sourceDataset: partial.sourceDataset,
      updatedAt: now,
    };
  },
};

export class SocrataCitySource implements DataSource {
  meta: DataSourceMeta;
  private config: SocrataCityConfig;

  constructor(config: SocrataCityConfig, status?: SourceCoverageStatus) {
    this.config = config;
    const enabled = Boolean(config.resourceUrl);
    this.meta = {
      id: config.id as DataSourceMeta["id"],
      name: config.name,
      county: config.county,
      state: config.state,
      status: status ?? (enabled ? "limited" : "coming_soon"),
      description: config.description,
    };
  }

  async fetchProjects(opts: DataSourceFetchOptions = {}): Promise<Project[]> {
    if (!this.config.resourceUrl) return [];

    const days = opts.days ?? 90;
    const params = new URLSearchParams({
      $limit: "500",
      ...(this.config.defaultParams ?? {}),
    });
    // Soft date filter when dataset supports issue_date / issue_date-like fields —
    // cities override via defaultParams.$where when needed.
    if (!params.has("$where") && days > 0) {
      // no-op: leave city-specific $where in defaultParams
    }

    const token =
      process.env[this.config.tokenEnv || "SOCRATA_APP_TOKEN"]?.trim() ||
      process.env.NYC_OPEN_DATA_APP_TOKEN?.trim();

    const url = `${this.config.resourceUrl}?${params.toString()}`;
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          ...(token ? { "X-App-Token": token } : {}),
        },
        next: { revalidate: 3600 },
      });
      if (!res.ok) {
        console.warn(
          `[${this.config.id}] Socrata fetch failed`,
          res.status,
          await res.text().catch(() => ""),
        );
        return [];
      }
      const rows = (await res.json()) as SocrataRow[];
      if (!Array.isArray(rows)) return [];
      return rows
        .map((row) => this.config.mapRow(row, this.config.id))
        .filter((p): p is Project => p != null);
    } catch (err) {
      console.warn(`[${this.config.id}] Socrata fetch error`, err);
      return [];
    }
  }
}
