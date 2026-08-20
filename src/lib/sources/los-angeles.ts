import type { Project } from "@/lib/db/types";
import type { DataSource, DataSourceFetchOptions } from "./types";
import { fetchSocrataRows, mapLaRow } from "@/lib/cities/fetch";
import { buildScoredProjects } from "@/lib/cities/score-permits";
import { replaceProjects } from "@/lib/db/store";

/**
 * Los Angeles Building Permits — live Socrata (LADBS).
 * Dataset: https://data.lacity.org/resource/xnhu-aczu.json
 * Note: geo lives in `location_1`; some recent rows lack coords — we only ingest geocoded rows.
 */
export class LosAngelesSource implements DataSource {
  meta = {
    id: "los_angeles" as const,
    name: "Los Angeles",
    county: "Los Angeles County",
    state: "CA",
    status: "live" as const,
    description: "Live LADBS building permits via Socrata (scored).",
  };

  resourceUrl() {
    return (
      process.env.CITY_LA_SOCRATA_URL?.trim() ||
      "https://data.lacity.org/resource/xnhu-aczu.json"
    );
  }

  async fetchProjects(opts: DataSourceFetchOptions = {}): Promise<Project[]> {
    const days = opts.days ?? 120;
    const since = new Date(Date.now() - days * 86400000)
      .toISOString()
      .slice(0, 10);
    const rows = await fetchSocrataRows(
      this.resourceUrl(),
      {
        $order: "issue_date DESC",
        $where: `location_1 IS NOT NULL AND issue_date >= '${since}'`,
      },
      { limit: 1000 },
    );
    // Fallback if date filter yields nothing (dataset lag)
    const effective =
      rows.length > 0
        ? rows
        : await fetchSocrataRows(
            this.resourceUrl(),
            {
              $order: "issue_date DESC",
              $where: "location_1 IS NOT NULL",
            },
            { limit: 800 },
          );
    const permits = effective
      .map(mapLaRow)
      .filter((p): p is NonNullable<typeof p> => p != null);
    const projects = buildScoredProjects("los_angeles", permits);
    await replaceProjects(projects, [], { cities: ["los_angeles"] });
    return projects;
  }
}

export const losAngelesSource = new LosAngelesSource();
