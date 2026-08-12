import { differenceInCalendarDays, parseISO } from "date-fns";
import type { ScoredSite } from "./types";

export type OpportunityView = ScoredSite & {
  title: string;
  distanceLabel: string;
  estOpportunity: string;
  buyingWindow: string;
  statusLine: string;
  permitAgeLabel: string;
  heat: "hot" | "buying" | "new" | "all";
  solutions: { name: string; tag: string }[];
  hasGc: boolean;
  hasArchitect: boolean;
  hasSignageProvider: boolean;
};

function titleFromSite(site: ScoredSite) {
  const desc = site.jobDescription.toLowerCase();
  if (/restaurant|cafe|food/.test(desc)) return "New Restaurant";
  if (/retail|store|shop/.test(desc)) return "Retail Buildout";
  if (/hotel|hospitality/.test(desc)) return "Hotel Signage Package";
  if (/office|commercial/.test(desc)) return "Commercial Identity";
  if (/school|education/.test(desc)) return "Campus Wayfinding";
  if (/hospital|medical|clinic/.test(desc)) return "Medical Campus Signs";
  if (site.jobType === "New Building") return "New Building Identity";
  if (site.signWork) return "Signage Permit Active";
  return "Exterior Sign Opportunity";
}

function estimateOpportunity(site: ScoredSite) {
  const score = site.probabilityScore;
  const cost = site.initialCost;
  let low = 8000;
  let high = 15000;
  if (cost >= 5_000_000 || (site.stories && site.stories >= 12)) {
    low = 35000;
    high = 75000;
  } else if (cost >= 1_000_000 || (site.floorArea && site.floorArea >= 30000)) {
    low = 18000;
    high = 40000;
  } else if (cost >= 250_000 || score >= 70) {
    low = 12000;
    high = 28000;
  } else if (score >= 55) {
    low = 8000;
    high = 18000;
  }
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);
  return `${fmt(low)} - ${fmt(high)}`;
}

function buyingWindow(site: ScoredSite) {
  if (site.probabilityScore >= 80) return "1 - 3 weeks";
  if (site.probabilityScore >= 68) return "2 - 4 weeks";
  if (site.probabilityScore >= 55) return "3 - 6 weeks";
  return "6 - 10 weeks";
}

function heat(site: ScoredSite): OpportunityView["heat"] {
  const ageDays = (() => {
    const raw = site.firstPermitDate || site.filingDate || site.currentStatusDate;
    if (!raw) return 999;
    try {
      return differenceInCalendarDays(new Date(), parseISO(raw.slice(0, 10)));
    } catch {
      return 999;
    }
  })();

  if (site.probabilityScore >= 78 || site.windowLabel.startsWith("Hot")) return "hot";
  if (site.signWork || /Permit Entire|Permit Issued/.test(site.filingStatus)) {
    return "buying";
  }
  if (ageDays <= 45) return "new";
  return "all";
}

function statusLine(site: ScoredSite) {
  if (site.signWork) return "Sign work filed";
  if (/Permit Entire|Permit Issued/.test(site.filingStatus)) return "Interior / exterior buildout";
  if (/Approved|Plan Examiner/.test(site.filingStatus)) return "Plans advancing";
  return site.filingStatus;
}

function permitAgeLabel(site: ScoredSite) {
  const dateRaw = site.firstPermitDate || site.currentStatusDate || site.filingDate;
  if (!dateRaw) return "Timing unknown";
  try {
    const days = differenceInCalendarDays(new Date(), parseISO(dateRaw.slice(0, 10)));
    if (days < 0) return "Recently updated";
    if (days === 0) return "Updated today";
    if (days === 1) return "Updated 1 day ago";
    return `Permit activity ${days} days ago`;
  } catch {
    return "Recently active";
  }
}

/** Legacy mobile path — no static recommendation list. */
function solutions(_site: ScoredSite) {
  return [] as { name: string; tag: string }[];
}

export function toOpportunity(site: ScoredSite, index = 0): OpportunityView {
  return {
    ...site,
    title: titleFromSite(site),
    distanceLabel: `${(0.3 + (index % 7) * 0.4).toFixed(1)} mi`,
    estOpportunity: estimateOpportunity(site),
    buyingWindow: buyingWindow(site),
    statusLine: statusLine(site),
    permitAgeLabel: permitAgeLabel(site),
    heat: heat(site),
    solutions: solutions(site),
    hasGc: Boolean(site.contact.phone || site.contact.filingRepName),
    hasArchitect: Boolean(site.contact.applicantName || site.contact.applicantBusiness),
    hasSignageProvider: false,
  };
}
