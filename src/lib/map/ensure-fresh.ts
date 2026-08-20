/**
 * Server-side map data freshness: render immediately when recent data exists;
 * otherwise auto-sync before the map page paints (no user-facing sync button).
 */

import { syncAllCities } from "@/lib/cities/sync-all";
import { isDatabaseConfigured } from "@/lib/db/prisma";
import { getSyncMeta, listProjects } from "@/lib/db/store";

/** Stale threshold: re-sync when last sync is older than this. */
export const MAP_DATA_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Shorter permit window so Netlify SSR / functions can finish under 60s. */
const AUTO_SYNC_DAYS = 21;

export type EnsureFreshResult = {
  synced: boolean;
  reason: "fresh" | "empty" | "stale" | "skipped_no_persist" | "error";
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
 */
export async function ensureMapDataFresh(): Promise<EnsureFreshResult> {
  const meta = await getSyncMeta();
  const existing = await listProjects();
  const empty = existing.length === 0;
  const stale = isStale(meta.lastSyncAt);

  if (!empty && !stale) {
    return {
      synced: false,
      reason: "fresh",
      projectCount: existing.length,
      lastSyncAt: meta.lastSyncAt,
    };
  }

  // On Netlify without a DB, memory store does not survive the next request,
  // but syncing in this same request still lets the page render real pins.
  if (process.env.NETLIFY && !isDatabaseConfigured()) {
    // Still attempt sync so this response has data; flag for ops visibility.
  }

  try {
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
