import type { Project } from "@/lib/db/types";
import type { DataSource, DataSourceFetchOptions } from "./types";
import { fetchSocrataRows, mapSanFranciscoRow } from "@/lib/cities/fetch";
import { buildScoredProjects } from "@/lib/cities/score-permits";
import { replaceProjects } from "@/lib/db/store";

/**
 * San Francisco Building Permits — DataSF Socrata.
 * Dataset: "Building Permits filed on or after January 1, 2013"
 * Resource: https://data.sfgov.org/resource/p4e4-a5a7.json
 * Optional override: CITY_SF_SOCRATA_URL
 */
export class SanFranciscoSource implements DataSource {
  meta = {
    id: "san_francisco" as const,
    name: "San Francisco",
    county: "San Francisco County",
    state: "CA",
    status: "live" as const,
    description:
      "Live DataSF building permits (p4e4-a5a7) with phase + Buy Score.",
  };

  resourceUrl() {
    return (
      process.env.CITY_SF_SOCRATA_URL?.trim() ||
      "https://data.sfgov.org/resource/p4e4-a5a7.json"
    );
  }

  async fetchProjects(opts: DataSourceFetchOptions = {}): Promise<Project[]> {
    const days = opts.days ?? 90;
    const since = new Date(Date.now() - days * 86400000)
      .toISOString()
      .slice(0, 10);
    const rows = await fetchSocrataRows(
      this.resourceUrl(),
      {
        $order: "filed_date DESC",
        $where: `location IS NOT NULL AND filed_date >= '${since}'`,
      },
      { limit: 1000 },
    );
    const effective =
      rows.length > 0
        ? rows
        : await fetchSocrataRows(
            this.resourceUrl(),
            {
              $order: "filed_date DESC",
              $where: "location IS NOT NULL",
            },
            { limit: 800 },
          );
    const permits = effective
      .map(mapSanFranciscoRow)
      .filter((p): p is NonNullable<typeof p> => p != null);
    const projects = buildScoredProjects("san_francisco", permits);
    await replaceProjects(projects, [], { cities: ["san_francisco"] });
    return projects;
  }
}

export const sanFranciscoSource = new SanFranciscoSource();
