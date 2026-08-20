import { chicagoSource } from "@/lib/sources/chicago";
import { losAngelesSource } from "@/lib/sources/los-angeles";
import { sanFranciscoSource } from "@/lib/sources/san-francisco";
import { bostonSource } from "@/lib/sources/boston";
import { seattleSource } from "@/lib/sources/seattle";
import { fortWorthSource } from "@/lib/sources/fort-worth";
import { miamiDadeSource } from "@/lib/sources/miami-dade";
import { syncDobData } from "@/lib/dob/sync";
import type { CityCode } from "@/lib/db/types";

const TARGET_CITIES = [
  "nyc",
  "chicago",
  "los_angeles",
  "san_francisco",
  "boston",
  "seattle",
  "fort_worth",
  "miami_dade",
] as const satisfies readonly CityCode[];

/**
 * Sync NYC (DOB) + active open-data city adapters.
 * Houston / Dallas / Phoenix held (stale or incomplete feeds).
 */
export async function syncAllCities(days = 90) {
  const results: Record<string, { ok: boolean; count: number; error?: string }> =
    {};

  try {
    const nyc = await syncDobData(days);
    results.nyc = { ok: true, count: nyc.counts.projects };
  } catch (err) {
    results.nyc = {
      ok: false,
      count: 0,
      error: err instanceof Error ? err.message : "nyc sync failed",
    };
  }

  const adapters = [
    { id: "chicago", source: chicagoSource },
    { id: "los_angeles", source: losAngelesSource },
    { id: "san_francisco", source: sanFranciscoSource },
    { id: "boston", source: bostonSource },
    { id: "seattle", source: seattleSource },
    { id: "fort_worth", source: fortWorthSource },
    { id: "miami_dade", source: miamiDadeSource },
  ] as const;

  await Promise.all(
    adapters.map(async ({ id, source }) => {
      try {
        const projects = await source.fetchProjects({ days });
        results[id] = { ok: true, count: projects.length };
      } catch (err) {
        results[id] = {
          ok: false,
          count: 0,
          error: err instanceof Error ? err.message : `${id} sync failed`,
        };
      }
    }),
  );

  return {
    ok: Object.values(results).some((r) => r.ok),
    cities: TARGET_CITIES,
    results,
  };
}
