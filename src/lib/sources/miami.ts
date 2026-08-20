import {
  SocrataCitySource,
  socrataHelpers,
  type SocrataRow,
} from "./socrata-generic";
import type { CityCode } from "@/lib/db/types";

/**
 * Miami-Dade building permits scaffold (Socrata-style).
 * Set CITY_MIAMI_SOCRATA_URL when the live resource is confirmed.
 */
function mapMiami(row: SocrataRow, city: CityCode) {
  const id =
    socrataHelpers.str(row.permit_number) ||
    socrataHelpers.str(row.objectid) ||
    socrataHelpers.str(row.id);
  const lat = socrataHelpers.num(row.latitude) ?? socrataHelpers.num(row.lat);
  const lng =
    socrataHelpers.num(row.longitude) ?? socrataHelpers.num(row.lng);
  const address =
    socrataHelpers.str(row.address) ||
    socrataHelpers.str(row.site_address) ||
    socrataHelpers.str(row.location);
  if (!id || lat == null || lng == null || !address) return null;

  return socrataHelpers.baseProject({
    id: `mia-${id}`,
    city,
    address,
    latitude: lat,
    longitude: lng,
    zip: socrataHelpers.str(row.zip) || socrataHelpers.str(row.zipcode),
    borough: "Miami-Dade",
    description: socrataHelpers.str(row.description) || socrataHelpers.str(row.permit_type),
    filingDate:
      socrataHelpers.str(row.issue_date) ||
      socrataHelpers.str(row.application_date),
    jobNumber: id,
    sourceDataset: "miami-dade-permits",
  });
}

const resourceUrl = process.env.CITY_MIAMI_SOCRATA_URL?.trim() || "";

export const miamiSource = new SocrataCitySource(
  {
    id: "miami",
    name: "Miami",
    county: "Miami-Dade County",
    state: "FL",
    resourceUrl,
    description: resourceUrl
      ? "Scaffold — Miami-Dade permits via configured Socrata URL."
      : "Coming soon — set CITY_MIAMI_SOCRATA_URL to enable feed.",
    mapRow: mapMiami,
  },
  resourceUrl ? "limited" : "coming_soon",
);
