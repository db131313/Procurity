import {
  fetchApprovedPermits,
  fetchCertificatesOfOccupancy,
  fetchDobNowFilings,
  fetchLegacyFilings,
  fetchPermitIssuance,
} from "./client";
import { normalizeProjects } from "./normalize";
import {
  expandDemoCoverage,
  listProjects,
  replaceProjects,
} from "@/lib/db/store";

export async function syncDobData(days = 45) {
  const previous = await listProjects();

  const [filings, permits, approved, cos, legacy] = await Promise.all([
    fetchDobNowFilings({ days, limit: 2500 }),
    fetchPermitIssuance({ days, limit: 2000 }),
    fetchApprovedPermits({ days, limit: 2500 }),
    fetchCertificatesOfOccupancy({ days: Math.max(days, 90), limit: 1200 }),
    fetchLegacyFilings({ days, limit: 1000 }),
  ]);

  const { projects, events } = normalizeProjects(
    { filings, permits, approved, cos, legacy },
    previous,
  );

  // Live pull replaces the store once we have real NYC rows
  const merged = projects.length ? projects : previous;

  const db = await replaceProjects(merged, events);
  await expandDemoCoverage(25);

  return {
    ok: true,
    source: "nyc-open-data",
    counts: {
      filings: filings.length,
      permits: permits.length,
      approved: approved.length,
      cos: cos.length,
      legacy: legacy.length,
      projects: db.projects.length,
      events: events.length,
    },
    lastSyncAt: db.lastSyncAt,
  };
}
