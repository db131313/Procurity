import type { Project } from "@/lib/db/types";
import type { DataSource, DataSourceFetchOptions } from "./types";
import { fetchSocrataRows, mapMiamiRow } from "@/lib/cities/fetch";
import { buildScoredProjects } from "@/lib/cities/score-permits";
import { replaceProjects } from "@/lib/db/store";

/**
 * Miami building permits — City of Miami Socrata dataset 7ey5-m434.
 *
 * FLAG: Default host `data.miamigov.com` is Socrata, but DNS/egress to that
 * domain can fail from some clouds. Set CITY_MIAMI_SOCRATA_URL to a reachable
 * mirror if needed. Until a successful fetch returns rows, status stays limited.
 */
export class MiamiSource implements DataSource {
  meta: DataSource["meta"] = {
    id: "miami",
    name: "Miami",
    county: "Miami-Dade County",
    state: "FL",
    status: "limited",
    description:
      "City of Miami permits via Socrata (7ey5-m434). Set CITY_MIAMI_SOCRATA_URL if data.miamigov.com is unreachable.",
  };

  resourceUrl() {
    return (
      process.env.CITY_MIAMI_SOCRATA_URL?.trim() ||
      "https://data.miamigov.com/resource/7ey5-m434.json"
    );
  }

  async fetchProjects(_opts: DataSourceFetchOptions = {}): Promise<Project[]> {
    const url = this.resourceUrl();
    if (!url) return [];
    try {
      const rows = await fetchSocrataRows(
        url,
        { $order: "IssuedDate DESC" },
        { limit: 800 },
      );
      if (!rows.length) {
        // Alternate column casing
        const alt = await fetchSocrataRows(url, {}, { limit: 500 });
        const permits = alt
          .map(mapMiamiRow)
          .filter((p): p is NonNullable<typeof p> => p != null);
        const projects = buildScoredProjects("miami", permits);
        if (projects.length) {
          this.meta.status = "live";
          await replaceProjects(projects, [], { cities: ["miami"] });
        }
        return projects;
      }
      const permits = rows
        .map(mapMiamiRow)
        .filter((p): p is NonNullable<typeof p> => p != null);
      const projects = buildScoredProjects("miami", permits);
      if (projects.length) {
        this.meta.status = "live";
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
