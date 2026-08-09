import { differenceInCalendarDays, parseISO } from "date-fns";
import type { DobNowFiling } from "./nyc-dob";
import type { ScoredSite } from "./types";

function num(value?: string | null) {
  if (!value) return 0;
  const n = Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function yes(value?: string | null) {
  return String(value ?? "").toUpperCase() === "YES";
}

function fullName(first?: string, last?: string) {
  const name = [first, last].filter(Boolean).join(" ").trim();
  return name || null;
}

function parseDate(value?: string | null) {
  if (!value) return null;
  try {
    return parseISO(value.slice(0, 10));
  } catch {
    return null;
  }
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Signage procurement window heuristics for NYC construction:
 * - Exterior identity / wayfinding / tenant / building signs are typically
 *   bought after structure advances and before final CO / late fit-out closeout.
 * - New buildings & major CO alterations dominate; explicit SIGN work is a spike.
 * - Tiny 1-family / fence-only / withdrawn / already signed-off jobs are demoted.
 */
export function scoreFiling(
  filing: DobNowFiling,
  phoneByBin: Map<string, string>,
): ScoredSite | null {
  const lat = Number(filing.latitude);
  const lng = Number(filing.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const status = filing.filing_status ?? "Unknown";
  const jobType = filing.job_type ?? "Unknown";
  const buildingType = filing.building_type ?? null;
  const desc = (filing.job_description ?? "").toLowerCase();
  const cost = num(filing.initial_cost);
  const floorArea = num(filing.total_construction_floor_area) || null;
  const stories =
    num(filing.proposed_no_of_stories) ||
    num(filing.existing_stories) ||
    null;

  // Hard filters for noise
  if (/fence|scaffolding|sidewalk shed only|temp(orary)? fence/.test(desc) && !yes(filing.sign)) {
    if (cost < 25000 && !/sign|storefront|facade|awning|canopy/.test(desc)) {
      return null;
    }
  }
  if (status === "Filing Withdrawn" || status === "Incomplete") return null;
  if (jobType === "Full Demolition" || jobType === "No Work") return null;

  let score = 28;
  const reasons: string[] = [];

  // Job type relevance
  if (jobType === "New Building") {
    score += 22;
    reasons.push("New Building — primary exterior/identity sign opportunity");
  } else if (jobType.includes("Alteration CO") || jobType.includes("ALT-CO")) {
    score += 18;
    reasons.push("CO-triggering alteration — occupancy branding often follows");
  } else if (jobType === "Alteration") {
    score += 8;
  }

  // Explicit sign work
  if (yes(filing.sign)) {
    score += 24;
    reasons.push("DOB filing flags SIGN work type");
  }
  if (/sign|storefront|awning|canopy|facade|marquee|wayfinding/.test(desc)) {
    score += 10;
    reasons.push("Job description mentions signage-adjacent scope");
  }

  // Construction progress / status window
  const activeWindow = ["Permit Entire", "Permit Issued", "Approved", "Plan Examiner Review"];
  const lateWindow = ["CO Issued", "LOC Issued", "TA Certificate of Operation Issued", "PA Certificate of Operation Issued"];
  if (activeWindow.includes(status)) {
    score += 16;
    reasons.push(`${status} — active procurement window`);
  } else if (lateWindow.includes(status)) {
    score -= 18;
    reasons.push(`${status} — late / closing window`);
  } else if (status.includes("Objections") || status.includes("On Hold")) {
    score -= 6;
  }

  // Building scale & use
  if (buildingType && /other|commercial|mixed|office|hotel|retail/i.test(buildingType)) {
    score += 10;
    reasons.push(`${buildingType} typology favors permanent sign packages`);
  }
  if (buildingType && /1 family|1-2-3/i.test(buildingType)) {
    score -= 14;
  }
  if (stories && stories >= 6) {
    score += 8;
    reasons.push(`${stories}-story scale supports multi-sign package`);
  } else if (stories && stories >= 3) {
    score += 4;
  }
  if (floorArea && floorArea >= 20000) {
    score += 8;
  } else if (floorArea && floorArea >= 5000) {
    score += 4;
  }
  if (cost >= 1_000_000) {
    score += 8;
    reasons.push("High construction value increases sign budget likelihood");
  } else if (cost >= 250_000) {
    score += 4;
  } else if (cost > 0 && cost < 15000) {
    score -= 10;
  }

  // Timing sweet spot: ~90–540 days from first permit / filing
  const anchor =
    parseDate(filing.first_permit_date) ||
    parseDate(filing.filing_date) ||
    parseDate(filing.approved_date);
  if (anchor) {
    const ageDays = differenceInCalendarDays(new Date(), anchor);
    if (ageDays >= 90 && ageDays <= 540) {
      score += 12;
      reasons.push(`Project age ${ageDays}d — mid-construction buy window`);
    } else if (ageDays > 540 && ageDays <= 900) {
      score += 4;
      reasons.push(`Mature project (${ageDays}d) — late exterior / tenant signs`);
    } else if (ageDays < 45) {
      score -= 8;
      reasons.push("Very early filing — too soon for most sign buys");
    } else if (ageDays > 1200) {
      score -= 12;
    }
  }

  // Work-type signals that exterior package is underway
  if (yes(filing.general_construction_work_type_) || yes(filing.structural_work_type_)) {
    score += 4;
  }
  if (yes(filing.curb_cut) || yes(filing.shed) || yes(filing.scaffold)) {
    score += 3;
    reasons.push("Site logistics active (shed/scaffold/curb) — exterior phase");
  }

  const ownerName = fullName(filing.owner_first_name, filing.owner_last_name);
  const applicantName = fullName(
    filing.applicant_first_name,
    filing.applicant_last_name,
  );
  const filingRepName = fullName(
    filing.filing_representative_first_name,
    filing.filing_representative_last_name,
  );
  const phone = filing.bin ? phoneByBin.get(filing.bin) ?? null : null;

  if (ownerName || filing.owner_s_business_name) {
    score += 4;
  }
  if (phone) {
    score += 6;
    reasons.push("Permittee phone available for outreach");
  } else if (applicantName || filingRepName) {
    score += 2;
    reasons.push("Applicant / expeditor contact available");
  }

  score = clamp(Math.round(score));

  let windowLabel = "Watchlist";
  if (score >= 80) windowLabel = "Hot — visit today";
  else if (score >= 65) windowLabel = "Open procurement window";
  else if (score >= 50) windowLabel = "Warming — qualify this week";
  else if (score >= 35) windowLabel = "Early / nurture";
  else windowLabel = "Low priority";

  const house = filing.house_no?.trim() ?? "";
  const street = filing.street_name?.trim() ?? "";
  const address = [house, street].filter(Boolean).join(" ") || "Address pending";

  return {
    id: filing.job_filing_number || `${filing.bin}-${lat}-${lng}`,
    rank: 0,
    address,
    borough: filing.borough ?? "NYC",
    latitude: lat,
    longitude: lng,
    jobType,
    filingStatus: status,
    buildingType,
    jobDescription: filing.job_description?.trim() || "No description filed.",
    initialCost: cost,
    floorArea,
    stories,
    filingDate: filing.filing_date ?? null,
    firstPermitDate: filing.first_permit_date ?? null,
    currentStatusDate: filing.current_status_date ?? null,
    bin: filing.bin ?? null,
    nta: filing.nta ?? null,
    signWork: yes(filing.sign),
    probabilityScore: score,
    windowLabel,
    windowReason: reasons.slice(0, 4),
    contact: {
      ownerName,
      ownerBusiness: filing.owner_s_business_name || null,
      ownerType: filing.owner_type || null,
      applicantName,
      applicantBusiness: filing.applicant_business_name || null,
      applicantTitle: filing.applicant_professional_title || null,
      filingRepName,
      filingRepBusiness: filing.filing_representative_business_name || null,
      phone,
      addressLine: [
        filing.applicant_street_name,
        [filing.city, filing.state, filing.zip].filter(Boolean).join(", "),
      ]
        .filter(Boolean)
        .join(" · ") || null,
    },
    source: "nyc-dob-now",
  };
}

export function rankTopSites(sites: ScoredSite[], limit = 20): ScoredSite[] {
  const byKey = new Map<string, ScoredSite>();
  for (const site of sites) {
    const key = site.bin || `${site.address}-${site.borough}`;
    const prev = byKey.get(key);
    if (!prev || site.probabilityScore > prev.probabilityScore) {
      byKey.set(key, site);
    }
  }

  return [...byKey.values()]
    .sort((a, b) => b.probabilityScore - a.probabilityScore)
    .slice(0, limit)
    .map((site, index) => ({ ...site, rank: index + 1 }));
}
