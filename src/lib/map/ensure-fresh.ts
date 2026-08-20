/**
 * Server-side map data freshness: render immediately when recent data exists;
 * otherwise auto-sync before the map page paints (no user-facing sync button).
 */

import { syncAllCities } from "@/lib/cities/sync-all";
import { chicagoSource } from "@/lib/sources/chicago";
import { losAngelesSource } from "@/lib/sources/los-angeles";
import { sanFranciscoSource } from "@/lib/sources/san-francisco";
import { bostonSource } from "@/lib/sources/boston";
import { syncDobData } from "@/lib/dob/sync";
import { isDatabaseConfigured } from "@/lib/db/prisma";
import { getSyncMeta, listProjects } from "@/lib/db/store";
import type { CityCode } from "@/lib/db/types";
import type { DataSource } from "@/lib/sources/types";

/** Stale threshold: re-sync when last sync is older than this. */
export const MAP_DATA_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Shorter permit window so Netlify SSR / functions can finish under 60s. */
const AUTO_SYNC_DAYS = 21;

const ACTIVE_CITIES = [
  "nyc",
  "chicago",
  "los_angeles",
  "san_francisco",
  "boston",
] as const satisfies readonly CityCode[];

const CITY_SOURCES: Partial<Record<CityCode, DataSource>> = {
  chicago: chicagoSource,
  los_angeles: losAngelesSource,
  san_francisco: sanFranciscoSource,
  boston: bostonSource,
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

/**
 * Ensure the store has recent projects for the map.
 * Call from the map RSC before listing projects.
 *
 * - Fresh + all active cities present → render immediately
 * - Empty or stale → full multi-city sync
 * - Fresh but missing cities (e.g. SF just added) → sync only the gaps
 */
export async function ensureMapDataFresh(): Promise<EnsureFreshResult> {
  const meta = await getSyncMeta();
  const existing = await listProjects();
  const empty = existing.length === 0;
  const stale = isStale(meta.lastSyncAt);
  const present = new Set(existing.map((p) => p.city));
  const missing = ACTIVE_CITIES.filter((c) => !present.has(c));

  if (!empty && !stale && missing.length === 0) {
    return {
      synced: false,
      reason: "fresh",
      projectCount: existing.length,
      lastSyncAt: meta.lastSyncAt,
    };
  }

  // On Netlify without a DB, memory store does not survive the next request,
  // but syncing in this same request still lets the page render real pins.
  void isDatabaseConfigured;

  try {
    if (empty || stale) {
      const result = await syncAllCities(AUTO_SYNC_DAYS);
      const after = await getSyncMeta();
      const listed = await listProjects();
      return {
        synced: true,
        reason: empty ? "empty" : "stale",
        projectCount: listed.length || after.projectCount,
        lastSyncAt: after.lastSyncAt,
        error: result.ok
          ? undefined
          : Object.values(result.results)
              .filter((r) => !r.ok)
              .map((r) => r.error)
              .filter(Boolean)
              .join("; ") || "partial sync failure",
      };
    }

    // Partial backfill for newly added cities without re-pulling everything.
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

    const after = await getSyncMeta();
    const listed = await listProjects();
    return {
      synced: true,
      reason: "missing_cities",
      projectCount: listed.length || after.projectCount,
      lastSyncAt: after.lastSyncAt,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ensureMapDataFresh]", message);
    return {
      synced: false,
      reason: "error",
      projectCount: existing.length,
      lastSyncAt: meta.lastSyncAt,
      error: message,
    };
  }
}
