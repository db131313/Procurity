import { NextResponse } from "next/server";
import { PICKER_CITIES } from "@/lib/cities/picker";
import { isValidTeaserCoord } from "@/lib/cities/teaser-bounds";
import { projectTeaserLabel } from "@/lib/cities/teaser-label";
import { listProjects } from "@/lib/db/store";
import { ensureMapDataFresh } from "@/lib/map/ensure-fresh";

export const dynamic = "force-dynamic";

const SERVED = PICKER_CITIES.filter((c) => c.served && c.cityCode);

function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}

/**
 * Public home swarm pin feed — compact fields only for every served city.
 * One listProjects() call (no per-city loop). Cached 5 minutes.
 */
export async function GET() {
  void ensureMapDataFresh().catch(() => {});

  const byCityCode = new Map(
    SERVED.map((c) => [c.cityCode as string, c] as const),
  );

  const byCity: Record<string, { totalCount: number; pinCount: number }> = {};
  for (const c of SERVED) {
    byCity[c.id] = { totalCount: 0, pinCount: 0 };
  }

  const pins: Array<{
    id: string;
    city: string;
    latitude: number;
    longitude: number;
    score: number;
    projectType: string;
  }> = [];

  const projects = await listProjects();
  for (const p of projects) {
    const city = byCityCode.get(String(p.city));
    if (!city) continue;
    if (!isValidTeaserCoord(p.latitude, p.longitude, city)) continue;
    const bucket = byCity[city.id]!;
    bucket.totalCount += 1;
    bucket.pinCount += 1;
    pins.push({
      id: p.id,
      city: city.id,
      latitude: round4(p.latitude),
      longitude: round4(p.longitude),
      score: p.score,
      projectType: projectTeaserLabel(p.jobType, p.occupancy, p.buildingType),
    });
  }

  return NextResponse.json(
    {
      ok: true,
      cities: SERVED.map((c) => c.id),
      byCity,
      pins,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
