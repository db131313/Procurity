/**
 * Miami building permits — City of Miami Socrata dataset 7ey5-m434.
 *
 * DEPRIORITIZED: Default host `data.miamigov.com` has been unreachable from
 * our egress environments. San Francisco replaced Miami in the active city set.
 * Keep this adapter for optional env override / future re-enable.
 */
import type { Project } from "@/lib/db/types";
import type { DataSource, DataSourceFetchOptions } from "./types";
import { fetchSocrataRows, mapMiamiRow } from "@/lib/cities/fetch";
import { buildScoredProjects } from "@/lib/cities/score-permits";
import { replaceProjects } from "@/lib/db/store";

export class MiamiSource implements DataSource {
  meta = {
    id: "miami" as const,
    name: "Miami",
    county: "Miami-Dade County",
    state: "FL",
    status: "limited" as const,
    description:
      "Deprioritized — data.miamigov.com connectivity issues. Set CITY_MIAMI_SOCRATA_URL to re-enable.",
  };

  resourceUrl() {
    return (
      process.env.CITY_MIAMI_SOCRATA_URL?.trim() ||
      "https://data.miamigov.com/resource/7ey5-m434.json"
    );
  }

  async fetchProjects(opts: DataSourceFetchOptions = {}): Promise<Project[]> {
    const days = opts.days ?? 90;
    try {
      const since = new Date(Date.now() - days * 86400000)
        .toISOString()
        .slice(0, 10);
      const rows = await fetchSocrataRows(
        this.resourceUrl(),
        {
          $order: "IssuedDate DESC",
          $where: `Latitude IS NOT NULL AND IssuedDate >= '${since}'`,
        },
        { limit: 800 },
      );
      const permits = rows
        .map(mapMiamiRow)
        .filter((p): p is NonNullable<typeof p> => p != null);
      const projects = buildScoredProjects("miami", permits);
      if (projects.length) {
        await replaceProjects(projects, [], { cities: ["miami"] });
      }
      return projects;
    } catch (err) {
      console.warn("[miami] fetch failed — check CITY_MIAMI_SOCRATA_URL", err);
      return [];
    }
  }
}

export const miamiSource = new MiamiSource();
