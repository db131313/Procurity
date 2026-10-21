import type { Project } from "@/lib/db/types";

const RESIDENTIAL_RE =
  /\b(1[\s-]?2\s*family|one[\s-]?family|two[\s-]?family|single[\s-]?family|residential|dwelling|condo|apartment|multi[\s-]?family|r-?2|r-?3|r-?4|townhouse|rowhouse)\b/i;

const COMMERCIAL_HINT_RE =
  /\b(commercial|retail|office|restaurant|hotel|industrial|warehouse|medical|school|mixed[\s-]?use|store|shop|clinic|hospitality)\b/i;

/** Exclude 1–2 family and other residential from the public demo. */
export function isResidentialProject(p: Project): boolean {
  const blob = [p.occupancy, p.buildingType, p.jobType, p.description]
    .filter(Boolean)
    .join(" ");
  if (!blob) return false;
  if (RESIDENTIAL_RE.test(blob) && !COMMERCIAL_HINT_RE.test(blob)) return true;
  if (RESIDENTIAL_RE.test(blob) && /family|dwelling|residential/i.test(blob)) {
    return !COMMERCIAL_HINT_RE.test(blob);
  }
  return RESIDENTIAL_RE.test(blob) && !COMMERCIAL_HINT_RE.test(blob);
}

export function isCommercialOrNonResidential(p: Project): boolean {
  return !isResidentialProject(p);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Public demo eligible: commercial / non-residential AND
 * (phase signage_filed OR last activity older than 60 days).
 */
export function isPublicDemoEligible(p: Project, now = Date.now()): boolean {
  if (!isCommercialOrNonResidential(p)) return false;
  if (p.phase === "signage_filed") return true;
  const last = Date.parse(p.lastActivityAt);
  if (!Number.isFinite(last)) return false;
  return now - last > 60 * DAY_MS;
}

export function phaseLabel(phase: string): string {
  return phase.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
