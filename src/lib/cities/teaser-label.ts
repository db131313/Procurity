/** Friendly project labels for public teaser pins (no permit jargon). */
export function projectTeaserLabel(
  jobType: string | null | undefined,
  occupancy: string | null | undefined,
  buildingType: string | null | undefined,
): string {
  const raw = (jobType || occupancy || buildingType || "").toLowerCase();
  if (/restaurant|food|dining/.test(raw)) return "New restaurant build-out";
  if (/retail|store|shop/.test(raw)) return "Retail renovation";
  if (/office|commercial/.test(raw)) return "Office fit-out";
  if (/hotel|hospitality/.test(raw)) return "Hospitality project";
  if (/medical|health|clinic/.test(raw)) return "Medical / clinic build";
  if (/school|education/.test(raw)) return "Education project";
  if (/warehouse|industrial/.test(raw)) return "Industrial / warehouse";
  if (/mixed/.test(raw)) return "Mixed-use project";
  return "New commercial project";
}
