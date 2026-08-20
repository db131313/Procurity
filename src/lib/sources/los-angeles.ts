import {
  SocrataCitySource,
  socrataHelpers,
  type SocrataRow,
} from "./socrata-generic";
import type { CityCode } from "@/lib/db/types";

/**
 * Los Angeles Building Permits (Socrata / data.lacity.org).
 * Default resource is commonly used; override with CITY_LA_SOCRATA_URL.
 */
function mapLa(row: SocrataRow, city: CityCode) {
  const id =
    socrataHelpers.str(row.permit_nbr) ||
    socrataHelpers.str(row.permit_number) ||
    socrataHelpers.str(row.record_id) ||
    socrataHelpers.str(row.id);
  const lat =
    socrataHelpers.num(row.latitude) ??
    socrataHelpers.num((row.location as { latitude?: number })?.latitude);
  const lng =
    socrataHelpers.num(row.longitude) ??
    socrataHelpers.num((row.location as { longitude?: number })?.longitude);
  const address =
    socrataHelpers.str(row.address_start) ||
    socrataHelpers.str(row.primary_address) ||
    [
      socrataHelpers.str(row.street_number),
      socrataHelpers.str(row.street_direction),
      socrataHelpers.str(row.street_name),
    ]
      .filter(Boolean)
      .join(" ");
  if (!id || lat == null || lng == null || !address) return null;

  return socrataHelpers.baseProject({
    id: `la-${id}`,
    city,
    address,
    latitude: lat,
    longitude: lng,
    zip: socrataHelpers.str(row.zip_code) || socrataHelpers.str(row.zipcode),
    borough: "Los Angeles",
    description:
      socrataHelpers.str(row.work_description) ||
      socrataHelpers.str(row.permit_type),
    filingDate:
      socrataHelpers.str(row.issue_date) ||
      socrataHelpers.str(row.status_date),
    jobNumber: id,
    sourceDataset: "la-building-permits",
  });
}

const resourceUrl =
  process.env.CITY_LA_SOCRATA_URL?.trim() ||
  "https://data.lacity.org/resource/pi9x-tgfr.json";

export const losAngelesSource = new SocrataCitySource(
  {
    id: "los_angeles",
    name: "Los Angeles",
    county: "Los Angeles County",
    state: "CA",
    resourceUrl,
    description:
      "Scaffold — LA building permits via Socrata (limited scoring).",
    mapRow: mapLa,
    defaultParams: {
      $limit: "400",
    },
  },
  "limited",
);
