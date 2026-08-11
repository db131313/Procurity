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

export async function syncDobData(days = 60) {
  const previous = await listProjects();

  const [filings, permits, approved, cos, legacy] = await Promise.all([
    // ~900 filings × 5 boroughs for balanced citywide coverage
    fetchDobNowFilingsCitywide({ days, perBorough: 900 }),
    fetchPermitIssuance({ days, limit: 2000 }),
    fetchApprovedPermits({ days, limit: 3000 }),
    fetchCertificatesOfOccupancy({ days: Math.max(days, 120), limit: 1500 }),
    fetchLegacyFilings({ days, limit: 1000 }),
  ]);

  const { projects, events } = normalizeProjects(
    { filings, permits, approved, cos, legacy },
    previous,
  );

  const merged = projects.length ? projects : previous;
  const db = await replaceProjects(merged, events);
  // Demo accounts see all five boroughs (no zip gate)
  await enableCitywideDemo();

  const byBorough: Record<string, number> = {};
  for (const p of db.projects) {
    const b = p.borough || "Unknown";
    byBorough[b] = (byBorough[b] ?? 0) + 1;
  }

  return {
    ok: true,
    source: "nyc-open-data",
    coverage: "all-five-boroughs",
    counts: {
      filings: filings.length,
      permits: permits.length,
      approved: approved.length,
      cos: cos.length,
      legacy: legacy.length,
      projects: db.projects.length,
      events: events.length,
      byBorough,
    },
    lastSyncAt: db.lastSyncAt,
  };
}
