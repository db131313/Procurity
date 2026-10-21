/**
 * Public-facing commercial filter — exclude primarily residential stock
 * from marketing proof counts (same spirit as scoring engine).
 */
export function isCommercialProject(
  occupancy?: string | null,
  buildingType?: string | null,
  jobType?: string | null,
): boolean {
  const hay = `${occupancy || ""} ${buildingType || ""} ${jobType || ""}`.toLowerCase();
  if (!hay.trim()) return true; // teaser labels already commercial-leaning
  if (/single.?family|1.?family|2.?family|duplex|condo|apartment|residential|dwelling|home|house/.test(hay)
    && !/mixed|commercial|retail|store|hotel|restaurant|office|warehouse|industrial/.test(hay)) {
    return false;
  }
  return true;
}
