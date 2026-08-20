import {
  fetchApprovedPermits,
  fetchCertificatesOfOccupancy,
  fetchDobNowFilingsCitywide,
  fetchLegacyFilings,
  fetchPermitIssuance,
} from "./client";
import { normalizeProjects } from "./normalize";
import {
  enableCitywideDemo,
  listProjects,
  replaceProjects,
} from "@/lib/db/store";

/** Rolling 90-day filing window + enrichment from approved/issuance/CO. */
export async function syncDobData(days = 90) {
  const previous = (await listProjects()).filter(
    (p) => p.city === "nyc" || !p.city,
  );

  const [filings, permits, approved, cos, legacy] = await Promise.all([
    fetchDobNowFilingsCitywide({ days, perBorough: 1000 }),
    fetchPermitIssuance({ days, limit: 2500 }),
    fetchApprovedPermits({ days, limit: 4000 }),
    fetchCertificatesOfOccupancy({ days: Math.max(days, 120), limit: 1500 }),
    fetchLegacyFilings({ days, limit: 1000 }),
  ]);

  const { projects, events, discarded } = await normalizeProjects(
    { filings, permits, approved, cos, legacy },
    previous,
  );

  const merged = projects.length ? projects : previous.filter((p) => p.city === "nyc");
  const db = await replaceProjects(merged, events, { cities: ["nyc"] });
  await enableCitywideDemo();

  const byBorough: Record<string, number> = {};
  const confidence: Record<string, number> = { high: 0, medium: 0, low: 0 };
  const nycProjects = (db.projects ?? merged).filter(
    (p: { city: string }) => p.city === "nyc",
  );
  for (const p of nycProjects) {
    const b = p.borough || "Unknown";
    byBorough[b] = (byBorough[b] ?? 0) + 1;
    confidence[p.scoreConfidence] =
      (confidence[p.scoreConfidence] ?? 0) + 1;
  }

  return {
    ok: true,
    source: "nyc-open-data",
    coverage: "all-five-boroughs",
    windowDays: days,
    counts: {
      filings: filings.length,
      permits: permits.length,
      approved: approved.length,
      cos: cos.length,
      legacy: legacy.length,
      projects: nycProjects.length,
      events: events.length,
      discarded,
      byBorough,
      scoreConfidence: confidence,
    },
    lastSyncAt: db.lastSyncAt,
  };
}
