import {
  SocrataCitySource,
  socrataHelpers,
  type SocrataRow,
} from "./socrata-generic";
import type { CityCode } from "@/lib/db/types";

/**
 * Boston building permits scaffold.
 * Boston often uses CKAN; when a Socrata mirror exists, set CITY_BOSTON_SOCRATA_URL.
 */
function mapBoston(row: SocrataRow, city: CityCode) {
  const id =
    socrataHelpers.str(row.permitnumber) ||
    socrataHelpers.str(row.permit_number) ||
    socrataHelpers.str(row.id);
  const lat = socrataHelpers.num(row.latitude) ?? socrataHelpers.num(row.y);
  const lng = socrataHelpers.num(row.longitude) ?? socrataHelpers.num(row.x);
  const address =
    socrataHelpers.str(row.address) ||
    socrataHelpers.str(row.workplace) ||
    [
      socrataHelpers.str(row.number),
      socrataHelpers.str(row.street),
      socrataHelpers.str(row.suffix),
    ]
      .filter(Boolean)
      .join(" ");
  if (!id || lat == null || lng == null || !address) return null;

  return socrataHelpers.baseProject({
    id: `bos-${id}`,
    city,
    address,
    latitude: lat,
    longitude: lng,
    zip: socrataHelpers.str(row.zip) || socrataHelpers.str(row.zipcode),
    borough: "Boston",
    description:
      socrataHelpers.str(row.description) ||
      socrataHelpers.str(row.worktype),
    filingDate:
      socrataHelpers.str(row.issued_date) ||
      socrataHelpers.str(row.issue_date),
    jobNumber: id,
    sourceDataset: "boston-building-permits",
  });
}

const resourceUrl = process.env.CITY_BOSTON_SOCRATA_URL?.trim() || "";

export const bostonSource = new SocrataCitySource(
  {
    id: "boston",
    name: "Boston",
    county: "Suffolk County (MA)",
    state: "MA",
    resourceUrl,
    description: resourceUrl
      ? "Scaffold — Boston permits via configured open-data URL."
      : "Coming soon — set CITY_BOSTON_SOCRATA_URL to enable feed.",
    mapRow: mapBoston,
  },
  resourceUrl ? "limited" : "coming_soon",
);
