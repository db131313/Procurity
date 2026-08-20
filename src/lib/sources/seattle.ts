import type { Project } from "@/lib/db/types";
import type { DataSource, DataSourceFetchOptions } from "./types";
import { fetchSocrataRows, mapSeattleRow } from "@/lib/cities/fetch";
import { buildScoredProjects } from "@/lib/cities/score-permits";
import { replaceProjects } from "@/lib/db/store";

/**
 * Seattle Building Permits — live Socrata.
 * Dataset: https://data.seattle.gov/resource/76t5-zqzr.json
 * Optional: CITY_SEATTLE_SOCRATA_URL
 */
export class SeattleSource implements DataSource {
  meta = {
    id: "seattle" as const,
    name: "Seattle",
    county: "King County",
    state: "WA",
    status: "live" as const,
    description:
      "Live Seattle building permits via Socrata (76t5-zqzr) with phase + Buy Score.",
  };

  resourceUrl() {
    return (
      process.env.CITY_SEATTLE_SOCRATA_URL?.trim() ||
      "https://data.seattle.gov/resource/76t5-zqzr.json"
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
        $order: "issueddate DESC",
        $where: `latitude IS NOT NULL AND longitude IS NOT NULL AND issueddate >= '${since}'`,
      },
      { limit: 1000 },
    );
    const effective =
      rows.length > 0
        ? rows
        : await fetchSocrataRows(
            this.resourceUrl(),
            {
              $order: "issueddate DESC",
              $where: "latitude IS NOT NULL AND longitude IS NOT NULL",
            },
            { limit: 800 },
          );
    const permits = effective
      .map(mapSeattleRow)
      .filter((p): p is NonNullable<typeof p> => p != null);
    const projects = buildScoredProjects("seattle", permits);
    await replaceProjects(projects, [], { cities: ["seattle"] });
    return projects;
  }
}

export const seattleSource = new SeattleSource();
