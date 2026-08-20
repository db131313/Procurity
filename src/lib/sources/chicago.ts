import {
  SocrataCitySource,
  socrataHelpers,
  type SocrataRow,
} from "./socrata-generic";
import type { CityCode } from "@/lib/db/types";

/**
 * Chicago Building Permits (Socrata).
 * Dataset: https://data.cityofchicago.org/resource/ydr8-5enu.json
 * Override with CITY_CHICAGO_SOCRATA_URL if the resource id changes.
 */
function mapChicago(row: SocrataRow, city: CityCode) {
  const id = socrataHelpers.str(row.permit_) || socrataHelpers.str(row.id);
  const lat = socrataHelpers.num(row.latitude);
  const lng = socrataHelpers.num(row.longitude);
  const street =
    [
      socrataHelpers.str(row.street_number),
      socrataHelpers.str(row.street_direction),
      socrataHelpers.str(row.street_name),
      socrataHelpers.str(row.suffix),
    ]
      .filter(Boolean)
      .join(" ") || socrataHelpers.str(row.work_description);
  if (!id || lat == null || lng == null || !street) return null;

  return socrataHelpers.baseProject({
    id: `chi-${id}`,
    city,
    address: street,
    latitude: lat,
    longitude: lng,
    zip: socrataHelpers.str(row.zip_code),
    borough: socrataHelpers.str(row.community_area) || "Chicago",
    description: socrataHelpers.str(row.work_description),
    estimatedJobCost: socrataHelpers.num(row.reported_cost),
    filingDate: socrataHelpers.str(row.issue_date),
    jobNumber: id,
    sourceDataset: "chicago-building-permits",
  });
}

const resourceUrl =
  process.env.CITY_CHICAGO_SOCRATA_URL?.trim() ||
  "https://data.cityofchicago.org/resource/ydr8-5enu.json";

export const chicagoSource = new SocrataCitySource(
  {
    id: "chicago",
    name: "Chicago",
    county: "Cook County",
    state: "IL",
    resourceUrl,
    description:
      "Scaffold — Chicago building permits via Socrata (limited scoring).",
    mapRow: mapChicago,
    defaultParams: {
      $order: "issue_date DESC",
      $where: "latitude IS NOT NULL AND longitude IS NOT NULL",
    },
  },
  "limited",
);
