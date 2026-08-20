import { chicagoSource } from "@/lib/sources/chicago";
import { losAngelesSource } from "@/lib/sources/los-angeles";
import { miamiSource } from "@/lib/sources/miami";
import { bostonSource } from "@/lib/sources/boston";
import { syncDobData } from "@/lib/dob/sync";
import type { CityCode } from "@/lib/db/types";

const TARGET_CITIES = [
  "nyc",
  "chicago",
  "los_angeles",
  "miami",
  "boston",
] as const satisfies readonly CityCode[];

/**
 * Sync NYC (DOB) + Chicago/LA/Miami/Boston open-data adapters.
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
    { id: "miami", source: miamiSource },
    { id: "boston", source: bostonSource },
  ] as const;

  for (const { id, source } of adapters) {
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
  }

  return {
    ok: Object.values(results).some((r) => r.ok),
    cities: TARGET_CITIES,
    results,
  };
}
