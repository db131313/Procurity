import {
  fetchApprovedPermits,
  fetchCertificatesOfOccupancy,
  fetchDobNowFilings,
  fetchLegacyFilings,
  fetchPermitIssuance,
} from "./client";
import { normalizeProjects } from "./normalize";
import { listProjects, replaceProjects } from "@/lib/db/store";

export async function syncDobData(days = 45) {
  const previous = await listProjects();

  const [filings, permits, approved, cos, legacy] = await Promise.all([
    fetchDobNowFilings({ days, limit: 1500 }),
    fetchPermitIssuance({ days, limit: 2000 }),
    fetchApprovedPermits({ days, limit: 1500 }),
    fetchCertificatesOfOccupancy({ days: Math.max(days, 90), limit: 800 }),
    fetchLegacyFilings({ days, limit: 1000 }),
  ]);

  const { projects, events } = normalizeProjects(
    { filings, permits, approved, cos, legacy },
    previous,
  );

  // Keep seed showcase projects if live pull is thin
  const merged =
    projects.length >= 8
      ? projects
      : [
          ...projects,
          ...previous.filter((p) => !projects.some((x) => x.id === p.id)),
        ];

  const db = await replaceProjects(merged, events);
  return {
    ok: true,
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
