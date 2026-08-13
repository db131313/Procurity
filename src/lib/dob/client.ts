/**
 * Typed NYC Open Data (Socrata) client.
 * City-agnostic ingestion interface; NYC datasets wired at launch.
 */

const BASE = "https://data.cityofnewyork.us/resource";

export const NYC_DATASETS = {
  permitIssuance: "ipu4-2q9a",
  dobNowFilings: "w9ak-ipjd",
  approvedPermits: "rbx6-tga4",
  certificateOfOccupancy: "pkdm-hqz6",
  legacyFilings: "ic3t-wcy2",
} as const;

export type DobNowFiling = {
  job_filing_number?: string;
  filing_status?: string;
  house_no?: string;
  street_name?: string;
  borough?: string;
  bin?: string;
  job_type?: string;
  building_type?: string;
  job_description?: string;
  initial_cost?: string;
  total_construction_floor_area?: string;
  proposed_no_of_stories?: string;
  filing_date?: string;
  first_permit_date?: string;
  current_status_date?: string;
  approved_date?: string;
  latitude?: string;
  longitude?: string;
  postcode?: string;
  sign?: string;
  owner_first_name?: string;
  owner_last_name?: string;
  owner_s_business_name?: string;
  applicant_first_name?: string;
  applicant_last_name?: string;
  applicant_business_name?: string;
  applicant_professional_title?: string;
  /** Rarely present in open data — mapped when available. */
  applicant_phone?: string;
  applicant_email?: string;
  applicant_website?: string;
  filing_representative_business_name?: string;
  general_construction_work_type_?: string;
  structural_work_type_?: string;
  foundation_work_type_?: string;
  plumbing_work_type_?: string;
  mechanical_work_type_?: string;
  electrical_work_type_?: string;
  fire_protection_work_type_?: string;
};

export type DobPermitIssuance = {
  bin__?: string;
  job__?: string;
  house__?: string;
  street_name?: string;
  borough?: string;
  zip_code?: string;
  permit_type?: string;
  work_type?: string;
  issuance_date?: string;
  permittee_s_business_name?: string;
  permittee_s_first_name?: string;
  permittee_s_last_name?: string;
  gis_latitude?: string;
  gis_longitude?: string;
  job_type?: string;
};

export type DobApprovedPermit = {
  job_filing_number?: string;
  bin?: string;
  house_no?: string;
  street_name?: string;
  borough?: string;
  work_type?: string;
  permit_status?: string;
  issued_date?: string;
  applicant_business_name?: string;
  filing_representative_business_name?: string;
  owner_business_name?: string;
  estimated_job_costs?: string;
  latitude?: string;
  longitude?: string;
  postcode?: string;
  zip_code?: string;
};

export type DobCO = {
  job_filing_number?: string;
  job_filing_name?: string;
  application_number?: string;
  bin?: string;
  house_no?: string;
  street_name?: string;
  borough?: string;
  c_of_o_status?: string;
  issue_date?: string;
  c_of_o_issuance_date?: string;
  submitted_date?: string;
  latitude?: string;
  longitude?: string;
  postcode?: string;
  zip_code?: string;
};

export type LegacyFiling = {
  job__?: string;
  borough?: string;
  house__?: string;
  street_name?: string;
  bin__?: string;
  job_type?: string;
  job_status?: string;
  job_description?: string;
  initial_cost?: string;
  pre__filing_date?: string;
  latest_action_date?: string;
  gis_latitude?: string;
  gis_longitude?: string;
  owner_s_business_name?: string;
  applicant_s_first_name?: string;
  applicant_s_last_name?: string;
};

function appToken() {
  return (
    process.env.NYC_OPEN_DATA_APP_TOKEN?.trim() ||
    process.env.NYC_OPENDATA_APP_TOKEN?.trim() ||
    undefined
  );
}

async function sodaFetch<T>(
  datasetId: string,
  params: Record<string, string>,
): Promise<T[]> {
  const url = new URL(`${BASE}/${datasetId}.json`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const headers: HeadersInit = { Accept: "application/json" };
  const token = appToken();
  if (token) headers["X-App-Token"] = token;

  const res = await fetch(url.toString(), {
    headers,
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`Socrata ${datasetId} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T[];
}

function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export type SyncWindowOptions = {
  /** Rolling window in days (default 45). */
  days?: number;
  limit?: number;
  borough?: string;
};

const NYC_BOROUGHS = [
  "Manhattan",
  "Brooklyn",
  "Queens",
  "Bronx",
  "Staten Island",
] as const;

export async function fetchDobNowFilings(opts: SyncWindowOptions = {}) {
  const days = opts.days ?? 90;
  const limit = opts.limit ?? 2000;
  const since = daysAgoIso(days);
  const boroughClause = opts.borough
    ? ` AND borough = '${opts.borough.replace(/'/g, "")}'`
    : "";
  // Pull filings even without coords — normalize enriches BIN lat/lng from other feeds
  // and logs discards when enrichment fails (no silent drop at fetch time).
  try {
    return await sodaFetch<DobNowFiling>(NYC_DATASETS.dobNowFilings, {
      $where: `filing_date >= '${since}'${boroughClause}`,
      $order: "filing_date DESC",
      $limit: String(limit),
    });
  } catch {
    // Fallback: geo-filtered if open where fails on some tenants
    return sodaFetch<DobNowFiling>(NYC_DATASETS.dobNowFilings, {
      $where: `filing_date >= '${since}' AND latitude IS NOT NULL AND longitude IS NOT NULL${boroughClause}`,
      $order: "filing_date DESC",
      $limit: String(limit),
    });
  }
}

/** Balanced pull across all five boroughs so SI/Bronx aren't crowded out. */
export async function fetchDobNowFilingsCitywide(opts: {
  days?: number;
  perBorough?: number;
} = {}) {
  const days = opts.days ?? 90;
  const perBorough = opts.perBorough ?? 1000;
  const batches = await Promise.all(
    NYC_BOROUGHS.map((borough) =>
      fetchDobNowFilings({ days, limit: perBorough, borough }),
    ),
  );
  const seen = new Set<string>();
  const merged: DobNowFiling[] = [];
  for (const batch of batches) {
    for (const row of batch) {
      const key =
        row.job_filing_number ||
        `${row.bin}-${row.filing_date}-${row.house_no}-${row.street_name}`;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(row);
    }
  }
  return merged;
}

export { NYC_BOROUGHS };

export async function fetchPermitIssuance(opts: SyncWindowOptions = {}) {
  const days = opts.days ?? 45;
  const limit = opts.limit ?? 3000;
  const since = daysAgoIso(days);
  try {
    const recent = await sodaFetch<DobPermitIssuance>(NYC_DATASETS.permitIssuance, {
      $where: `issuance_date >= '${since}'`,
      $order: "issuance_date DESC",
      $limit: String(limit),
    });
    if (recent.length) return recent;
  } catch {
    // fall through — classic BIS permit feed can lag / stall
  }
  // Fallback: pull latest available rows for GC / phone enrichment
  try {
    return await sodaFetch<DobPermitIssuance>(NYC_DATASETS.permitIssuance, {
      $where: "gis_latitude IS NOT NULL",
      $order: "issuance_date DESC",
      $limit: String(Math.min(limit, 1500)),
    });
  } catch {
    return [];
  }
}

export async function fetchApprovedPermits(opts: SyncWindowOptions = {}) {
  const limit = opts.limit ?? 4000;
  const days = opts.days ?? 90;
  const since = daysAgoIso(days);
  // Prefer date-filtered pull when issued_date is queryable; otherwise latest geo rows.
  try {
    const dated = await sodaFetch<DobApprovedPermit>(
      NYC_DATASETS.approvedPermits,
      {
        $where: `issued_date >= '${since}'`,
        $order: "issued_date DESC",
        $limit: String(limit),
      },
    );
    if (dated.length) return dated;
  } catch {
    // issued_date may be unavailable on some Socrata views
  }
  try {
    return await sodaFetch<DobApprovedPermit>(NYC_DATASETS.approvedPermits, {
      $where: "latitude IS NOT NULL AND longitude IS NOT NULL",
      $order: "job_filing_number DESC",
      $limit: String(limit),
    });
  } catch {
    return [];
  }
}

export async function fetchCertificatesOfOccupancy(opts: SyncWindowOptions = {}) {
  const days = opts.days ?? 90;
  const limit = opts.limit ?? 1000;
  const since = daysAgoIso(days);
  try {
    return await sodaFetch<DobCO>(NYC_DATASETS.certificateOfOccupancy, {
      $where: `submitted_date >= '${since}' AND latitude IS NOT NULL`,
      $order: "submitted_date DESC",
      $limit: String(limit),
    });
  } catch {
    try {
      return await sodaFetch<DobCO>(NYC_DATASETS.certificateOfOccupancy, {
        $where: "latitude IS NOT NULL",
        $order: "submitted_date DESC",
        $limit: String(limit),
      });
    } catch {
      return [];
    }
  }
}

export async function fetchLegacyFilings(opts: SyncWindowOptions = {}) {
  const days = opts.days ?? 45;
  const limit = opts.limit ?? 1500;
  const since = daysAgoIso(days);
  try {
    const recent = await sodaFetch<LegacyFiling>(NYC_DATASETS.legacyFilings, {
      $where: `latest_action_date >= '${since}' AND gis_latitude IS NOT NULL`,
      $order: "latest_action_date DESC",
      $limit: String(limit),
    });
    if (recent.length) return recent;
  } catch {
    // classic BIS feed is largely historical
  }
  return [];
}
