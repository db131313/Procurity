import type { Project } from "@/lib/db/types";
import type { DataSource, DataSourceFetchOptions } from "./types";
import {
  arcGisDateLiteral,
  fetchArcGisFeatures,
  mapMiamiDadeFeature,
} from "@/lib/cities/fetch";
import { buildScoredProjects } from "@/lib/cities/score-permits";
import { replaceProjects } from "@/lib/db/store";

/**
 * Miami-Dade County Building Permits — ArcGIS MD_LandInformation layer 1.
 * https://gisweb.miamidade.gov/arcgis/rest/services/MD_LandInformation/MapServer/1
 *
 * No job-value field: Buy Score uses NO_VALUATION_WEIGHTS (phase/type/status).
 * Optional: CITY_MIAMI_DADE_ARCGIS_URL
 *
 * Date filters must use ArcGIS date literals (`date'YYYY-MM-DD'`), not epoch ms.
 */
export class MiamiDadeSource implements DataSource {
  meta = {
    id: "miami_dade" as const,
    name: "Miami-Dade",
    county: "Miami-Dade County",
    state: "FL",
    status: "live" as const,
    description:
      "Live Miami-Dade County building permits via ArcGIS (no job value — score weights type/status).",
  };

  layerUrl() {
    return (
      process.env.CITY_MIAMI_DADE_ARCGIS_URL?.trim() ||
      "https://gisweb.miamidade.gov/arcgis/rest/services/MD_LandInformation/MapServer/1"
    );
  }

  async fetchProjects(opts: DataSourceFetchOptions = {}): Promise<Project[]> {
    const days = opts.days ?? 90;
    const since = arcGisDateLiteral(days);
    let features = await fetchArcGisFeatures(
      this.layerUrl(),
      {
        where: `ISSUDATE >= ${since}`,
        orderByFields: "ISSUDATE DESC",
      },
      { limit: 1000 },
    );
    if (features.length === 0) {
      features = await fetchArcGisFeatures(
        this.layerUrl(),
        {
          where: `ISSUDATE >= ${since} AND TYPE = 'BLDG'`,
        },
        { limit: 1000 },
      );
    }
    if (features.length === 0) {
      features = await fetchArcGisFeatures(
        this.layerUrl(),
        { where: `ISSUDATE >= ${since}` },
        { limit: 800 },
      );
    }
    const permits = features
      .map(mapMiamiDadeFeature)
      .filter((p): p is NonNullable<typeof p> => p != null);
    const projects = buildScoredProjects("miami_dade", permits);
    await replaceProjects(projects, [], { cities: ["miami_dade"] });
    return projects;
  }
}

export const miamiDadeSource = new MiamiDadeSource();
