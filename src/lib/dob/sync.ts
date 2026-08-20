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

/** Rolling filing window + enrichment. Tuned for Netlify ≤60s when days≤21. */
export async function syncDobData(days = 90) {
  const previous = (await listProjects()).filter(
    (p) => p.city === "nyc" || !p.city,
  );

  // Smaller pulls on short windows so serverless sync finishes.
  const light = days <= 30;
  const perBorough = light ? 250 : 1000;
  const permitLimit = light ? 800 : 2500;
  const approvedLimit = light ? 1000 : 4000;
  const coLimit = light ? 500 : 1500;
  const legacyLimit = light ? 400 : 1000;

  const [filings, permits, approved, cos, legacy] = await Promise.all([
    fetchDobNowFilingsCitywide({ days, perBorough }),
    fetchPermitIssuance({ days, limit: permitLimit }),
    fetchApprovedPermits({ days, limit: approvedLimit }),
    fetchCertificatesOfOccupancy({
      days: Math.max(days, light ? days : 120),
      limit: coLimit,
    }),
    fetchLegacyFilings({ days, limit: legacyLimit }),
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
