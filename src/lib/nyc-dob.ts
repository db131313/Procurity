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
const CLASSIC_JOBS_URL = "https://data.cityofnewyork.us/resource/ic3t-wcy2.json";
const PERMITS_URL = "https://data.cityofnewyork.us/resource/ipu4-2q9a.json";

function soql(parts: string[]) {
  return parts.filter(Boolean).join(" AND ");
}

function escapeSoql(value: string) {
  return value.replace(/'/g, "");
}

type ClassicJob = {
  job__?: string;
  borough?: string;
  house__?: string;
  street_name?: string;
  bin__?: string;
  job_type?: string;
  job_status?: string;
  job_status_descrp?: string;
  building_type?: string;
  job_description?: string;
  initial_cost?: string;
  total_construction_floor_area?: string;
  proposed_no_of_stories?: string;
  existingno_of_stories?: string;
  pre__filing_date?: string;
  fully_permitted?: string;
  approved?: string;
  latest_action_date?: string;
  gis_latitude?: string;
  gis_longitude?: string;
  gis_nta_name?: string;
  owner_s_first_name?: string;
  owner_s_last_name?: string;
  owner_s_business_name?: string;
  owner_type?: string;
  applicant_s_first_name?: string;
  applicant_s_last_name?: string;
  applicant_professional_title?: string;
  city_?: string;
  state?: string;
  zip?: string;
  owner_shouse_street_name?: string;
  sign_?: string;
};

const CLASSIC_STATUS_MAP: Record<string, string> = {
  R: "Permit Entire",
  Q: "Permit Issued",
  P: "Approved",
  H: "Plan Examiner Review",
  K: "Approved",
  D: "Approved",
};

const CLASSIC_JOB_TYPE_MAP: Record<string, string> = {
  NB: "New Building",
  A1: "Alteration CO",
  A2: "Alteration",
  A3: "Alteration",
};

function normalizeClassicJob(job: ClassicJob): DobNowFiling | null {
  const status = CLASSIC_STATUS_MAP[job.job_status ?? ""];
  if (!status) return null;
  const jobType = CLASSIC_JOB_TYPE_MAP[job.job_type ?? ""] ?? job.job_type;
  if (!jobType) return null;

  const filingDate = job.pre__filing_date
    ? new Date(job.pre__filing_date).toISOString()
    : undefined;

  return {
    job_filing_number: job.job__ ? `BIS-${job.job__}` : undefined,
    filing_status: status,
    house_no: job.house__,
    street_name: job.street_name,
    borough: job.borough
      ? job.borough.charAt(0) + job.borough.slice(1).toLowerCase().replace(/ (\w)/g, (_, c: string) => ` ${c.toUpperCase()}`)
      : undefined,
    bin: job.bin__,
    job_type: jobType,
    building_type: job.building_type,
    job_description: job.job_description,
    initial_cost: job.initial_cost,
    total_construction_floor_area: job.total_construction_floor_area,
    proposed_no_of_stories: job.proposed_no_of_stories,
    existing_stories: job.existingno_of_stories,
    filing_date: filingDate,
    first_permit_date: job.fully_permitted
      ? new Date(job.fully_permitted).toISOString()
      : undefined,
    current_status_date: job.latest_action_date
      ? new Date(job.latest_action_date).toISOString()
      : filingDate,
    approved_date: job.approved ? new Date(job.approved).toISOString() : undefined,
    latitude: job.gis_latitude,
    longitude: job.gis_longitude,
    nta: job.gis_nta_name,
    sign: job.sign_ === "X" || job.sign_ === "Y" ? "YES" : "NO",
    owner_first_name: job.owner_s_first_name,
    owner_last_name: job.owner_s_last_name,
    owner_s_business_name: job.owner_s_business_name,
    owner_type: job.owner_type,
    applicant_first_name: job.applicant_s_first_name,
    applicant_last_name: job.applicant_s_last_name,
    applicant_professional_title: job.applicant_professional_title,
    applicant_street_name: job.owner_shouse_street_name,
    city: job.city_,
    state: job.state,
    zip: job.zip,
  };
}

export async function fetchDobNowCandidates(options?: {
  limit?: number;
  borough?: string | null;
}): Promise<DobNowFiling[]> {
  const limit = options?.limit ?? 600;
  const borough = options?.borough?.trim();

  const where = soql([
    "latitude IS NOT NULL",
    "longitude IS NOT NULL",
    "filing_status NOT IN ('Filing Withdrawn','Incomplete','LOC Issued')",
    "(job_type IN ('New Building','Alteration CO','ALT-CO - New Building with Existing Elements to Remain') OR sign = 'YES')",
    borough ? `upper(borough) = '${escapeSoql(borough).toUpperCase()}'` : "",
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

/** Citywide classic BIS job filings — covers boroughs underrepresented in DOB NOW open extract. */
export async function fetchClassicJobCandidates(options?: {
  limit?: number;
  borough?: string | null;
}): Promise<DobNowFiling[]> {
  const limit = options?.limit ?? 500;
  const borough = options?.borough?.trim();

  const where = soql([
    "gis_latitude IS NOT NULL",
    "gis_longitude IS NOT NULL",
    "job_type IN ('NB','A1')",
    "job_status IN ('R','Q','P','H','K')",
    borough ? `borough = '${escapeSoql(borough).toUpperCase()}'` : "",
  ]);

  const url = new URL(CLASSIC_JOBS_URL);
  url.searchParams.set("$where", where);
  url.searchParams.set("$order", "latest_action_date DESC");
  url.searchParams.set("$limit", String(limit));

  const res = await fetch(url.toString(), {
    next: { revalidate: 3600 },
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`NYC classic DOB jobs request failed (${res.status})`);
  }

  const rows = (await res.json()) as ClassicJob[];
  return rows
    .map(normalizeClassicJob)
    .filter((row): row is DobNowFiling => Boolean(row));
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
