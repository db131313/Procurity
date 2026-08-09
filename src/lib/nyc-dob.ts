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
  existing_stories?: string;
  filing_date?: string;
  first_permit_date?: string;
  current_status_date?: string;
  approved_date?: string;
  signoff_date?: string;
  latitude?: string;
  longitude?: string;
  postcode?: string;
  nta?: string;
  sign?: string;
  owner_first_name?: string;
  owner_last_name?: string;
  owner_s_business_name?: string;
  owner_type?: string;
  applicant_first_name?: string;
  applicant_last_name?: string;
  applicant_business_name?: string;
  applicant_professional_title?: string;
  filing_representative_first_name?: string;
  filing_representative_last_name?: string;
  filing_representative_business_name?: string;
  applicant_street_name?: string;
  city?: string;
  state?: string;
  zip?: string;
  general_construction_work_type_?: string;
  structural_work_type_?: string;
  foundation_work_type_?: string;
  curb_cut?: string;
  shed?: string;
  scaffold?: string;
};

export type DobPermit = {
  bin__?: string;
  job__?: string;
  house__?: string;
  street_name?: string;
  borough?: string;
  permittee_s_phone__?: string;
  permittee_s_business_name?: string;
  permittee_s_first_name?: string;
  permittee_s_last_name?: string;
  owner_s_first_name?: string;
  owner_s_last_name?: string;
  owner_s_business_name?: string;
  gis_latitude?: string;
  gis_longitude?: string;
  issuance_date?: string;
};

const DOB_NOW_URL = "https://data.cityofnewyork.us/resource/w9ak-ipjd.json";
const PERMITS_URL = "https://data.cityofnewyork.us/resource/ipu4-2q9a.json";

function soql(parts: string[]) {
  return parts.filter(Boolean).join(" AND ");
}

export async function fetchDobNowCandidates(limit = 400): Promise<DobNowFiling[]> {
  const where = soql([
    "latitude IS NOT NULL",
    "longitude IS NOT NULL",
    "filing_status NOT IN ('Filing Withdrawn','Incomplete')",
    "(job_type IN ('New Building','Alteration CO','ALT-CO - New Building with Existing Elements to Remain') OR sign = 'YES')",
  ]);

  const url = new URL(DOB_NOW_URL);
  url.searchParams.set("$where", where);
  url.searchParams.set("$order", "current_status_date DESC");
  url.searchParams.set("$limit", String(limit));

  const res = await fetch(url.toString(), {
    next: { revalidate: 3600 },
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`NYC DOB NOW request failed (${res.status})`);
  }

  return (await res.json()) as DobNowFiling[];
}

export async function fetchPhonesByBins(
  bins: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(bins.filter(Boolean))].slice(0, 40);
  if (unique.length === 0) return map;

  const quoted = unique.map((b) => `'${b.replace(/'/g, "")}'`).join(",");
  const url = new URL(PERMITS_URL);
  url.searchParams.set(
    "$where",
    `bin__ in(${quoted}) AND permittee_s_phone__ IS NOT NULL`,
  );
  url.searchParams.set("$order", "issuance_date DESC");
  url.searchParams.set("$limit", "200");

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return map;
    const rows = (await res.json()) as DobPermit[];
    for (const row of rows) {
      if (row.bin__ && row.permittee_s_phone__ && !map.has(row.bin__)) {
        map.set(row.bin__, formatPhone(row.permittee_s_phone__));
      }
    }
  } catch {
    // Phone enrichment is best-effort.
  }

  return map;
}

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw;
}
