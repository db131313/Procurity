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

function clamp(n: number, min = 0, max = 99) {
  return Math.max(min, Math.min(max, n));
}

function isNoiseDescription(desc: string) {
  return (
    /temporary (8'|8’|construction )?fence|plywood fence|sidewalk shed only|scaffold only|tax abatement|solar tax|no work under this|in conjunction with (nb|demo)/i.test(
      desc,
    ) && !/sign|storefront|awning|canopy|marquee|facade sign/i.test(desc)
  );
}

/**
 * Signage procurement window score (0–99).
 * Components are capped so the Top 20 differentiates instead of stacking to 100.
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
  const desc = (filing.job_description ?? "").trim();
  const descLower = desc.toLowerCase();
  const cost = num(filing.initial_cost);
  const floorArea = num(filing.total_construction_floor_area) || null;
  const stories =
    num(filing.proposed_no_of_stories) ||
    num(filing.existing_stories) ||
    null;

  if (status === "Filing Withdrawn" || status === "Incomplete") return null;
  if (jobType === "Full Demolition" || jobType === "No Work") return null;
  if (isNoiseDescription(descLower)) return null;

  // Thin / secondary filings with no economic signal and no sign flag
  const meaningfulCost = cost >= 100000;
  const meaningfulScale =
    floorArea !== null &&
    floorArea >= 12000 &&
    stories !== null &&
    stories >= 4 &&
    cost >= 25000;
  if (!yes(filing.sign) && !meaningfulCost && !meaningfulScale) {
    return null;
  }
  // Cost-less or token-cost secondary filings are noisy even on large sites
  if (!yes(filing.sign) && cost < 25000) {
    return null;
  }

  let jobPts = 0;
  let statusPts = 0;
  let timingPts = 0;
  let scalePts = 0;
  let signPts = 0;
  let contactPts = 0;
  const reasons: string[] = [];

  if (jobType === "New Building") {
    jobPts = 18;
    reasons.push("New Building — primary exterior/identity sign opportunity");
  } else if (jobType.includes("Alteration CO") || jobType.includes("ALT-CO")) {
    jobPts = 15;
    reasons.push("CO-triggering alteration — occupancy branding often follows");
  } else if (jobType === "Alteration") {
    jobPts = 7;
  }

  const activeWindow = [
    "Permit Entire",
    "Permit Issued",
    "Approved",
    "Plan Examiner Review",
  ];
  const lateWindow = [
    "CO Issued",
    "LOC Issued",
    "TA Certificate of Operation Issued",
    "PA Certificate of Operation Issued",
  ];
  if (activeWindow.includes(status)) {
    statusPts = status === "Permit Entire" || status === "Permit Issued" ? 16 : 11;
    reasons.push(`${status} — active procurement window`);
  } else if (lateWindow.includes(status)) {
    statusPts = -16;
    reasons.push(`${status} — late / closing window`);
  } else if (status.includes("Objections") || status.includes("On Hold")) {
    statusPts = -5;
  }

  const anchor =
    parseDate(filing.first_permit_date) ||
    parseDate(filing.filing_date) ||
    parseDate(filing.approved_date);
  if (anchor) {
    const ageDays = differenceInCalendarDays(new Date(), anchor);
    if (ageDays >= 120 && ageDays <= 480) {
      timingPts = 14;
      reasons.push(`Project age ${ageDays}d — mid-construction buy window`);
    } else if (ageDays >= 60 && ageDays < 120) {
      timingPts = 8;
      reasons.push(`Project age ${ageDays}d — approaching buy window`);
    } else if (ageDays > 480 && ageDays <= 840) {
      timingPts = 5;
      reasons.push(`Mature project (${ageDays}d) — late exterior / tenant signs`);
    } else if (ageDays < 45) {
      timingPts = -8;
      reasons.push("Very early filing — too soon for most sign buys");
    } else if (ageDays > 1100) {
      timingPts = -12;
    } else {
      timingPts = 1;
    }
  }

  if (buildingType && /other|commercial|mixed|office|hotel|retail/i.test(buildingType)) {
    scalePts += 6;
    reasons.push(`${buildingType} typology favors permanent sign packages`);
  }
  if (buildingType && /1 family|1-2-3/i.test(buildingType)) {
    scalePts -= 10;
  }
  if (stories && stories >= 10) scalePts += 7;
  else if (stories && stories >= 5) scalePts += 4;
  else if (stories && stories >= 3) scalePts += 2;

  if (floorArea && floorArea >= 50000) scalePts += 7;
  else if (floorArea && floorArea >= 15000) scalePts += 5;
  else if (floorArea && floorArea >= 5000) scalePts += 3;

  if (cost >= 5_000_000) {
    scalePts += 8;
    reasons.push("High construction value increases sign budget likelihood");
  } else if (cost >= 1_000_000) {
    scalePts += 5;
  } else if (cost >= 250_000) {
    scalePts += 3;
  } else if (cost > 0 && cost < 25000) {
    scalePts -= 6;
  } else if (cost === 0) {
    scalePts -= 10;
  }
  scalePts = Math.max(-14, Math.min(16, scalePts));

  if (yes(filing.sign)) {
    signPts += 12;
    reasons.push("DOB filing flags SIGN work type");
  }
  if (/sign|storefront|awning|canopy|facade|marquee|wayfinding/.test(descLower)) {
    signPts += 6;
    reasons.push("Job description mentions signage-adjacent scope");
  }
  if (yes(filing.curb_cut) || yes(filing.shed) || yes(filing.scaffold)) {
    signPts += 2;
  }
  signPts = Math.min(16, signPts);

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

  const ownerBusiness = filing.owner_s_business_name || null;
  const weakOwner =
    !ownerBusiness ||
    /^(n\/a|na|none|not applicable|pr|tbd|unknown)$/i.test(ownerBusiness.trim());
  if ((ownerName || ownerBusiness) && !weakOwner) contactPts += 3;
  else if (ownerName) contactPts += 1;
  if (phone) {
    contactPts += 6;
    reasons.push("Permittee phone available for outreach");
  } else if (applicantName || filingRepName) {
    contactPts += 2;
    reasons.push("Applicant / expeditor contact available");
  }

  const raw =
    12 + jobPts + statusPts + timingPts + scalePts + signPts + contactPts;
  const score = clamp(Math.round(raw));

  let windowLabel = "Watchlist";
  if (score >= 82) windowLabel = "Hot — visit today";
  else if (score >= 68) windowLabel = "Open procurement window";
  else if (score >= 52) windowLabel = "Warming — qualify this week";
  else if (score >= 38) windowLabel = "Early / nurture";
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
    jobDescription: desc || "No description filed.",
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
    } else if (
      prev &&
      site.probabilityScore === prev.probabilityScore &&
      site.initialCost > prev.initialCost
    ) {
      byKey.set(key, site);
    }
  }

  return [...byKey.values()]
    .sort((a, b) => {
      if (b.probabilityScore !== a.probabilityScore) {
        return b.probabilityScore - a.probabilityScore;
      }
      const phoneBoost = (s: ScoredSite) => (s.contact.phone ? 1 : 0);
      if (phoneBoost(b) !== phoneBoost(a)) return phoneBoost(b) - phoneBoost(a);
      return b.initialCost - a.initialCost;
    })
    .slice(0, limit)
    .map((site, index) => ({ ...site, rank: index + 1 }));
}
