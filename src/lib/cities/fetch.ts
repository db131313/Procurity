/**
 * Fetch + normalize helpers for multi-city open-data feeds.
 */

import type { CityCode } from "@/lib/db/types";
import { buildScoredProjects, type RawCityPermit } from "./score-permits";
import { socrataHelpers, type SocrataRow } from "@/lib/sources/socrata-generic";

const { str, num } = socrataHelpers;

export async function fetchSocrataRows(
  resourceUrl: string,
  params: Record<string, string> = {},
  opts?: { tokenEnv?: string; limit?: number },
): Promise<SocrataRow[]> {
  if (!resourceUrl) return [];
  const qs = new URLSearchParams({
    $limit: String(opts?.limit ?? 800),
    ...params,
  });
  const token =
    process.env[opts?.tokenEnv || "SOCRATA_APP_TOKEN"]?.trim() ||
    process.env.NYC_OPEN_DATA_APP_TOKEN?.trim();
  const url = `${resourceUrl}?${qs.toString()}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(token ? { "X-App-Token": token } : {}),
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    console.warn("[socrata]", resourceUrl, res.status, await res.text().catch(() => ""));
    return [];
  }
  const rows = (await res.json()) as SocrataRow[];
  return Array.isArray(rows) ? rows : [];
}

/** Boston CKAN DataStore (not Socrata). */
export async function fetchBostonCkanRows(limit = 800): Promise<SocrataRow[]> {
  const resourceId =
    process.env.CITY_BOSTON_CKAN_RESOURCE_ID?.trim() ||
    "6ddcd912-32a0-43df-9908-63574f8c7e77";
  const res = await fetch(
    "https://data.boston.gov/api/3/action/datastore_search",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resource_id: resourceId,
        limit,
        sort: "issued_date desc",
      }),
      next: { revalidate: 0 },
    },
  );
  if (!res.ok) {
    console.warn("[boston-ckan]", res.status);
    return [];
  }
  const body = (await res.json()) as {
    success?: boolean;
    result?: { records?: SocrataRow[] };
  };
  if (!body.success) return [];
  return body.result?.records ?? [];
}

function parseMoney(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(String(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function mapChicagoRow(row: SocrataRow): RawCityPermit | null {
  const id = str(row.permit_) || str(row.id);
  const lat = num(row.latitude);
  const lng = num(row.longitude);
  const street =
    [
      str(row.street_number),
      str(row.street_direction),
      str(row.street_name),
      str(row.suffix),
    ]
      .filter(Boolean)
      .join(" ") || str(row.work_description);
  if (!id || lat == null || lng == null || !street) return null;
  return {
    id,
    address: street,
    latitude: lat,
    longitude: lng,
    zip: str(row.zip_code) || str(row.contact_1_zipcode),
    borough: str(row.community_area) ? `Community ${str(row.community_area)}` : "Chicago",
    description: str(row.work_description),
    permitType: str(row.permit_type) || str(row.review_type),
    workType: str(row.work_type),
    status: str(row.permit_status) || str(row.permit_milestone),
    estimatedJobCost: parseMoney(row.reported_cost),
    filingDate: str(row.issue_date) || str(row.application_start_date),
    ownerName: str(row.contact_1_name),
    applicantName: str(row.contact_2_name),
    sourceDataset: "chicago-building-permits",
  };
}

export function mapLaRow(row: SocrataRow): RawCityPermit | null {
  const id = str(row.pcis_permit) || str(row.permit_nbr) || str(row.id);
  const loc = row.location_1 as
    | { type?: string; coordinates?: [number, number] }
    | undefined;
  const lng = loc?.coordinates?.[0] ?? num(row.longitude);
  const lat = loc?.coordinates?.[1] ?? num(row.latitude);
  const address = [
    str(row.address_start),
    str(row.street_direction),
    str(row.street_name),
    str(row.street_suffix),
  ]
    .filter(Boolean)
    .join(" ");
  if (!id || lat == null || lng == null || !address) return null;
  return {
    id,
    address,
    latitude: lat,
    longitude: lng,
    zip: str(row.zip_code),
    borough: str(row.initiating_office) || "Los Angeles",
    description: str(row.work_description),
    permitType: str(row.permit_type),
    workType: str(row.permit_sub_type),
    status: str(row.latest_status),
    estimatedJobCost: parseMoney(row.valuation),
    filingDate: str(row.issue_date) || str(row.status_date),
    buildingType: str(row.permit_sub_type),
    occupancy: str(row.permit_sub_type),
    gcName: str(row.contractors_business_name),
    applicantName: str(row.applicant_first_name),
    sourceDataset: "la-building-permits",
  };
}

export function mapMiamiRow(row: SocrataRow): RawCityPermit | null {
  const id =
    str(row.ApplicationNumber) ||
    str(row.permit_number) ||
    str(row.ID) ||
    str(row.id);
  const lat = num(row.Latitude) ?? num(row.latitude) ?? num(row.lat);
  const lng = num(row.Longitude) ?? num(row.longitude) ?? num(row.lng);
  const address =
    str(row.DeliveryAddress) ||
    str(row.address) ||
    str(row.site_address) ||
    str(row.location);
  if (!id || lat == null || lng == null || !address) return null;
  return {
    id,
    address,
    latitude: lat,
    longitude: lng,
    zip: str(row.CompanyZip) || str(row.zip) || str(row.zipcode),
    borough: "Miami",
    description:
      str(row.WorkItems) ||
      str(row.description) ||
      str(row.BuildingPermitStatusDescription),
    permitType: str(row.RequiredCertificate) || str(row.permit_type),
    status:
      str(row.BuildingPermitStatusDescription) ||
      str(row.status),
    estimatedJobCost: parseMoney(row.valuation) ?? parseMoney(row.EstimatedValue),
    filingDate: str(row.IssuedDate) || str(row.issue_date) || str(row.PlanCreatedDate),
    gcName: str(row.CompanyName),
    applicantName: str(row.CompanyName),
    sourceDataset: "miami-building-permits",
  };
}

/** DataSF Building Permits (p4e4-a5a7) — GeoJSON `location` Point. */
export function mapSanFranciscoRow(row: SocrataRow): RawCityPermit | null {
  const id = str(row.permit_number) || str(row.record_id) || str(row.id);
  const loc = row.location as
    | { type?: string; coordinates?: [number, number] }
    | undefined;
  const lng = loc?.coordinates?.[0] ?? num(row.longitude);
  const lat = loc?.coordinates?.[1] ?? num(row.latitude);
  const address = [
    str(row.street_number),
    str(row.street_name),
    str(row.street_suffix),
  ]
    .filter(Boolean)
    .join(" ");
  if (!id || lat == null || lng == null || !address) return null;
  const estimated = parseMoney(row.estimated_cost);
  const revised = parseMoney(row.revised_cost);
  const cost =
    revised != null && revised > 1
      ? revised
      : estimated != null && estimated > 0
        ? estimated
        : revised;
  return {
    id,
    address,
    latitude: lat,
    longitude: lng,
    zip: str(row.zipcode),
    borough:
      str(row.neighborhoods_analysis_boundaries) || "San Francisco",
    description: str(row.description),
    permitType:
      str(row.permit_type_definition) || str(row.permit_type),
    workType: str(row.permit_type_definition),
    status: str(row.status),
    estimatedJobCost: cost,
    filingDate:
      str(row.filed_date) ||
      str(row.issued_date) ||
      str(row.permit_creation_date),
    occupancy: str(row.proposed_occupancy) || str(row.existing_occupancy),
    buildingType:
      str(row.proposed_use) ||
      str(row.existing_use) ||
      str(row.proposed_construction_type_description),
    sourceDataset: "sf-building-permits",
  };
}

export function mapBostonRow(row: SocrataRow): RawCityPermit | null {
  const id = str(row.permitnumber) || str(row._id) || str(row.id);
  const lat = num(row.y_latitude) ?? num(row.latitude);
  const lng = num(row.x_longitude) ?? num(row.longitude);
  const address = str(row.address);
  if (!id || lat == null || lng == null || !address) return null;
  return {
    id,
    address,
    latitude: lat,
    longitude: lng,
    zip: str(row.zip)?.replace(/\D/g, "").slice(0, 5) || null,
    borough: str(row.city) || "Boston",
    description: [str(row.description), str(row.comments)].filter(Boolean).join(" — "),
    permitType: str(row.permittypedescr) || str(row.worktype),
    workType: str(row.worktype),
    status: str(row.status),
    estimatedJobCost: parseMoney(row.declared_valuation),
    filingDate: str(row.issued_date),
    occupancy: str(row.occupancytype),
    applicantName: str(row.applicant),
    sourceDataset: "boston-approved-building-permits",
  };
}

export async function ingestCity(
  city: CityCode,
  permits: RawCityPermit[],
) {
  return buildScoredProjects(city, permits);
}
