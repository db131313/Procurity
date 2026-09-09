/**
 * Server-side map data freshness.
 * Prefer non-blocking use via next/server `after()` so map HTML can paint first.
 */

import { syncAllCities } from "@/lib/cities/sync-all";
import { chicagoSource } from "@/lib/sources/chicago";
import { losAngelesSource } from "@/lib/sources/los-angeles";
import { sanFranciscoSource } from "@/lib/sources/san-francisco";
import { bostonSource } from "@/lib/sources/boston";
import { seattleSource } from "@/lib/sources/seattle";
import { fortWorthSource } from "@/lib/sources/fort-worth";
import { miamiDadeSource } from "@/lib/sources/miami-dade";
import { syncDobData } from "@/lib/dob/sync";
import { isDatabaseConfigured } from "@/lib/db/prisma";
import { getSyncMeta, listProjects } from "@/lib/db/store";
import type { CityCode } from "@/lib/db/types";
import type { DataSource } from "@/lib/sources/types";

export const MAP_DATA_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const AUTO_SYNC_DAYS = 21;

const ACTIVE_CITIES = [
  "nyc",
  "chicago",
  "los_angeles",
  "san_francisco",
  "boston",
  "seattle",
  "fort_worth",
  "miami_dade",
] as const satisfies readonly CityCode[];

const CITY_SOURCES: Partial<Record<CityCode, DataSource>> = {
  chicago: chicagoSource,
  los_angeles: losAngelesSource,
  san_francisco: sanFranciscoSource,
  boston: bostonSource,
  seattle: seattleSource,
  fort_worth: fortWorthSource,
  miami_dade: miamiDadeSource,
};

export type EnsureFreshResult = {
  synced: boolean;
  reason: "fresh" | "empty" | "stale" | "missing_cities" | "error";
  projectCount: number;
  lastSyncAt: string | null;
  error?: string;
};

function isStale(lastSyncAt: string | null): boolean {
  if (!lastSyncAt) return true;
  const t = new Date(lastSyncAt).getTime();
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > MAP_DATA_MAX_AGE_MS;
}

/** Fast metadata peek — does not sync. Avoids loading every project row. */
export async function peekMapFreshness(): Promise<{
  empty: boolean;
  stale: boolean;
  missing: CityCode[];
  projectCount: number;
  lastSyncAt: string | null;
}> {
  const meta = await getSyncMeta();
  const stale = isStale(meta.lastSyncAt);

  if (isDatabaseConfigured()) {
    const { getPrisma } = await import("@/lib/db/prisma");
    const prisma = getPrisma();
    const [projectCount, cityGroups] = await Promise.all([
      prisma.project.count(),
      prisma.project.groupBy({ by: ["city"] }),
    ]);
    const present = new Set(cityGroups.map((g) => g.city));
    const missing = ACTIVE_CITIES.filter((c) => !present.has(c)) as CityCode[];
    return {
      empty: projectCount === 0,
      stale,
      missing,
      projectCount,
      lastSyncAt: meta.lastSyncAt,
    };
  }

  const existing = await listProjects();
  const present = new Set(existing.map((p) => p.city));
  const missing = ACTIVE_CITIES.filter((c) => !present.has(c)) as CityCode[];
  return {
    empty: existing.length === 0,
    stale,
    missing,
    projectCount: existing.length,
    lastSyncAt: meta.lastSyncAt,
  };
}

/**
 * Ensure the store has recent projects.
 * Prefer calling this inside `after()` so the map page can paint first
 * whenever any pins already exist.
 */
export async function ensureMapDataFresh(): Promise<EnsureFreshResult> {
  const peek = await peekMapFreshness();
  const { empty, stale, missing } = peek;

  if (!empty && !stale && missing.length === 0) {
    return {
      synced: false,
      reason: "fresh",
      projectCount: peek.projectCount,
      lastSyncAt: peek.lastSyncAt,
    };
  }

  try {
    if (empty || stale) {
      const result = await syncAllCities(AUTO_SYNC_DAYS);
      const afterMeta = await getSyncMeta();
      return {
        synced: true,
        reason: empty ? "empty" : "stale",
        projectCount: afterMeta.projectCount,
        lastSyncAt: afterMeta.lastSyncAt,
        error: result.ok
          ? undefined
          : Object.values(result.results)
              .filter((r) => !r.ok)
              .map((r) => r.error)
              .filter(Boolean)
              .join("; ") || "partial sync failure",
      };
    }

    await Promise.all(
      missing.map(async (city) => {
        if (city === "nyc") {
          await syncDobData(AUTO_SYNC_DAYS);
          return;
        }
        const source = CITY_SOURCES[city];
        if (source) await source.fetchProjects({ days: AUTO_SYNC_DAYS });
      }),
    );

    const afterMeta = await getSyncMeta();
    return {
      synced: true,
      reason: "missing_cities",
      projectCount: afterMeta.projectCount,
      lastSyncAt: afterMeta.lastSyncAt,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ensureMapDataFresh]", message);
    return {
      synced: false,
      reason: "error",
      projectCount: peek.projectCount,
      lastSyncAt: peek.lastSyncAt,
      error: message,
    };
  }
}
