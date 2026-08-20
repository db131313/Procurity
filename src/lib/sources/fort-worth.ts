import type { Project } from "@/lib/db/types";
import type { DataSource, DataSourceFetchOptions } from "./types";
import {
  arcGisDateLiteral,
  fetchArcGisFeatures,
  mapFortWorthFeature,
} from "@/lib/cities/fetch";
import { buildScoredProjects } from "@/lib/cities/score-permits";
import { replaceProjects } from "@/lib/db/store";

/**
 * Fort Worth building permits — ArcGIS CIVIC/Permits layer 0.
 * https://mapit.fortworthtexas.gov/ags/rest/services/CIVIC/Permits/MapServer/0
 * Optional: CITY_FORT_WORTH_ARCGIS_URL
 */
export class FortWorthSource implements DataSource {
  meta = {
    id: "fort_worth" as const,
    name: "Fort Worth",
    county: "Tarrant County",
    state: "TX",
    status: "live" as const,
    description:
      "Live Fort Worth CIVIC permits via ArcGIS (JobValue + geo) with phase + Buy Score.",
  };

  layerUrl() {
    return (
      process.env.CITY_FORT_WORTH_ARCGIS_URL?.trim() ||
      "https://mapit.fortworthtexas.gov/ags/rest/services/CIVIC/Permits/MapServer/0"
    );
  }

  async fetchProjects(opts: DataSourceFetchOptions = {}): Promise<Project[]> {
    const days = opts.days ?? 90;
    const since = arcGisDateLiteral(days);
    // Prefer valued building/accessory permits; fall back to any geocoded rows.
    let features = await fetchArcGisFeatures(
      this.layerUrl(),
      {
        where: `Latitude IS NOT NULL AND JobValue > 0 AND File_Date >= ${since}`,
        orderByFields: "File_Date DESC",
      },
      { limit: 1000 },
    );
    if (features.length === 0) {
      features = await fetchArcGisFeatures(
        this.layerUrl(),
        {
          where: `Latitude IS NOT NULL AND File_Date >= ${since}`,
          orderByFields: "File_Date DESC",
        },
        { limit: 1000 },
      );
    }
    if (features.length === 0) {
      features = await fetchArcGisFeatures(
        this.layerUrl(),
        {
          where: "Latitude IS NOT NULL AND JobValue > 0",
          orderByFields: "File_Date DESC",
        },
        { limit: 800 },
      );
    }
    const permits = features
      .map(mapFortWorthFeature)
      .filter((p): p is NonNullable<typeof p> => p != null);
    const projects = buildScoredProjects("fort_worth", permits);
    await replaceProjects(projects, [], { cities: ["fort_worth"] });
    return projects;
  }
}

export const fortWorthSource = new FortWorthSource();
