import type { Project } from "@/lib/db/types";
import type { DataSource, DataSourceFetchOptions } from "./types";
import { fetchSocrataRows, mapChicagoRow } from "@/lib/cities/fetch";
import { buildScoredProjects } from "@/lib/cities/score-permits";
import { replaceProjects } from "@/lib/db/store";

/**
 * Chicago Building Permits — live Socrata.
 * Dataset: https://data.cityofchicago.org/resource/ydr8-5enu.json
 */
export class ChicagoSource implements DataSource {
  meta = {
    id: "chicago" as const,
    name: "Chicago",
    county: "Cook County",
    state: "IL",
    status: "live" as const,
    description: "Live Chicago building permits via Socrata (scored).",
  };

  resourceUrl() {
    return (
      process.env.CITY_CHICAGO_SOCRATA_URL?.trim() ||
      "https://data.cityofchicago.org/resource/ydr8-5enu.json"
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
        $order: "issue_date DESC",
        $where: `latitude IS NOT NULL AND longitude IS NOT NULL AND issue_date >= '${since}'`,
      },
      { limit: 1000 },
    );
    const permits = rows
      .map(mapChicagoRow)
      .filter((p): p is NonNullable<typeof p> => p != null);
    const projects = buildScoredProjects("chicago", permits);
    await replaceProjects(projects, [], { cities: ["chicago"] });
    return projects;
  }
}

export const chicagoSource = new ChicagoSource();
