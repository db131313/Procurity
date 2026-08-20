import type { Project } from "@/lib/db/types";
import type { DataSource, DataSourceFetchOptions } from "./types";
import { fetchBostonCkanRows, mapBostonRow } from "@/lib/cities/fetch";
import { buildScoredProjects } from "@/lib/cities/score-permits";
import { replaceProjects } from "@/lib/db/store";

/**
 * Boston Approved Building Permits — CKAN DataStore (NOT Socrata).
 * Package: https://data.boston.gov/dataset/approved-building-permits
 * Resource: 6ddcd912-32a0-43df-9908-63574f8c7e77
 * Optional: CITY_BOSTON_CKAN_RESOURCE_ID to override.
 * CITY_BOSTON_SOCRATA_URL is unused (Boston does not publish this feed on Socrata).
 */
export class BostonSource implements DataSource {
  meta = {
    id: "boston" as const,
    name: "Boston",
    county: "Suffolk County (MA)",
    state: "MA",
    status: "live" as const,
    description:
      "Live Boston approved building permits via CKAN DataStore (scored).",
  };

  async fetchProjects(opts: DataSourceFetchOptions = {}): Promise<Project[]> {
    const limit = Math.min(1500, Math.max(200, (opts.days ?? 90) * 10));
    const rows = await fetchBostonCkanRows(limit);
    const permits = rows
      .map(mapBostonRow)
      .filter((p): p is NonNullable<typeof p> => p != null)
      // Prefer rows with recent issued_date when available
      .filter((p) => {
        if (!opts.days || !p.filingDate) return true;
        const age =
          (Date.now() - new Date(p.filingDate).getTime()) / 86400000;
        return age <= opts.days + 30;
      });
    const projects = buildScoredProjects("boston", permits);
    await replaceProjects(projects, [], { cities: ["boston"] });
    return projects;
  }
}

export const bostonSource = new BostonSource();
