import { NextResponse } from "next/server";
import { TEASER_PIN_LIMIT, PICKER_CITIES } from "@/lib/cities/picker";
import { isValidTeaserCoord } from "@/lib/cities/teaser-bounds";
import { projectTeaserLabel } from "@/lib/cities/teaser-label";
import { listProjects } from "@/lib/db/store";
import { ensureMapDataFresh } from "@/lib/map/ensure-fresh";

export const dynamic = "force-dynamic";

const SERVED = PICKER_CITIES.filter((c) => c.served && c.cityCode);

/**
 * Up to TEASER_PIN_LIMIT real pins for every served city in one response.
 * Cached 5 minutes. Freshness sync is non-blocking.
 */
export async function GET() {
  void ensureMapDataFresh().catch(() => {});

  const byCity: Record<
    string,
    { totalCount: number; pins: Array<{
      id: string;
      latitude: number;
      longitude: number;
      score: number;
      label: string;
      city: string;
    }> }
  > = {};
  const pins: Array<{
    id: string;
    latitude: number;
    longitude: number;
    score: number;
    label: string;
    city: string;
  }> = [];

  // Sequential reads — file-backed store is not safe under concurrent listProjects.
  for (const city of SERVED) {
    const projects = await listProjects({ city: city.cityCode! });
    const valid = projects
      .filter((p) => isValidTeaserCoord(p.latitude, p.longitude, city))
      .sort((a, b) => b.score - a.score);
    const cityPins = valid.slice(0, TEASER_PIN_LIMIT).map((p) => ({
      id: p.id,
      latitude: p.latitude,
      longitude: p.longitude,
      score: p.score,
      label: projectTeaserLabel(p.jobType, p.occupancy, p.buildingType),
      city: city.id,
    }));
    byCity[city.id] = { totalCount: valid.length, pins: cityPins };
    pins.push(...cityPins);
  }

  return NextResponse.json(
    {
      ok: true,
      pinLimitPerCity: TEASER_PIN_LIMIT,
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
