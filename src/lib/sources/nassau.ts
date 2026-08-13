/**
 * Nassau County multi-municipality adapter.
 * Aggregates from per-town sub-sources; towns without a live feed stay as
 * marked placeholders and return no fabricated permit rows.
 */

import type { Project } from "@/lib/db/types";
import type { DataSource, DataSourceFetchOptions } from "./types";

export type NassauSourceType =
  | "accela"
  | "cloudpermit"
  | "csv"
  | "arcgis"
  | "html_portal"
  | "placeholder";

export type NassauSubSource = {
  municipality: string;
  sourceType: NassauSourceType;
  /** Public search / open-data endpoint when known. */
  endpoint: string;
  /** Field map: source field → unified schema key */
  fieldMap?: Partial<
    Record<
      | "address"
      | "estimatedJobCost"
      | "workType"
      | "filingDate"
      | "status"
      | "applicant"
      | "gc"
      | "architect"
      | "latitude"
      | "longitude",
      string
    >
  >;
  notes?: string;
  enabled: boolean;
};

/**
 * Config list — add towns one at a time as real feeds are identified.
 * No fabricated permit data: disabled / placeholder sources yield [].
 */
export const NASSAU_SUB_SOURCES: NassauSubSource[] = [
  {
    municipality: "Town of Oyster Bay",
    sourceType: "html_portal",
    endpoint: "https://oysterbaytown.com/buildingportal",
    enabled: false,
    notes:
      "Building Division portal (online applications). No documented open JSON feed yet — wire when Accela/Citizen Access API or export is confirmed.",
  },
  {
    municipality: "Town of Hempstead",
    sourceType: "placeholder",
    endpoint: "https://hempsteadny.gov/",
    enabled: false,
    notes: "TODO: identify Accela / CloudPermit / GIS open feed URL",
  },
  {
    municipality: "Town of North Hempstead",
    sourceType: "placeholder",
    endpoint: "https://www.northhempsteadny.gov/",
    enabled: false,
    notes: "TODO: identify municipal permit open-data endpoint",
  },
  {
    municipality: "City of Glen Cove",
    sourceType: "placeholder",
    endpoint: "https://glencove.civicplus.com/",
    enabled: false,
    notes: "TODO: per-city permit portal mapping",
  },
  {
    municipality: "City of Long Beach",
    sourceType: "placeholder",
    endpoint: "https://www.longbeachny.gov/",
    enabled: false,
    notes: "TODO: per-city permit portal mapping",
  },
  {
    municipality: "Nassau County GIS (parcels only)",
    sourceType: "arcgis",
    endpoint:
      "https://gis.nassaucountyny.gov/server/rest/services/Hosted/TownCity/FeatureServer",
    enabled: false,
    notes:
      "County ArcGIS has municipal boundaries / parcels — NOT live building permits. Kept for reference only.",
  },
];

async function fetchSubSource(
  src: NassauSubSource,
  _opts?: DataSourceFetchOptions,
): Promise<Project[]> {
  if (!src.enabled || src.sourceType === "placeholder") {
    return [];
  }

  // Accela / CloudPermit / ArcGIS permit layers will plug in here using fieldMap.
  // Until a real JSON/CSV permit feed is confirmed for a town, return [].
  if (src.sourceType === "arcgis" || src.sourceType === "html_portal") {
    return [];
  }

  if (src.sourceType === "csv" || src.sourceType === "accela" || src.sourceType === "cloudpermit") {
    // TODO: implement SODA/Accela/CSV parsers per municipality when endpoints land.
    return [];
  }

  return [];
}

export class NassauSource implements DataSource {
  meta = {
    id: "nassau" as const,
    name: "Nassau",
    county: "Nassau County",
    state: "NY",
    status: "limited" as const,
    description:
      "Nassau County (partial coverage) — town-by-town feeds; no fabricated permits.",
  };

  async fetchProjects(opts?: DataSourceFetchOptions): Promise<Project[]> {
    const batches = await Promise.all(
      NASSAU_SUB_SOURCES.map((src) => fetchSubSource(src, opts)),
    );
    return batches.flat();
  }

  /** Inspect which municipalities are configured / enabled. */
  listSubSources() {
    return NASSAU_SUB_SOURCES.map((s) => ({
      municipality: s.municipality,
      sourceType: s.sourceType,
      endpoint: s.endpoint,
      enabled: s.enabled,
      notes: s.notes ?? null,
    }));
  }
}

export const nassauSource = new NassauSource();
