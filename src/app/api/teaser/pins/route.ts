import { NextResponse } from "next/server";
import {
  getPickerCity,
  TEASER_PIN_LIMIT,
} from "@/lib/cities/picker";
import { isValidTeaserCoord } from "@/lib/cities/teaser-bounds";
import { projectTeaserLabel } from "@/lib/cities/teaser-label";
import { listProjects } from "@/lib/db/store";
import { ensureMapDataFresh } from "@/lib/map/ensure-fresh";

export const dynamic = "force-dynamic";

/**
 * Public teaser pin feed for the marketing home map.
 * Capped locations only — no scores, contacts, or values.
 *
 * IMPORTANT: Netlify must vary cache by `city` query (Netlify-Vary).
 * Without it, one city's response is reused for every city.
 * Prefer `/api/teaser/pins/[city]` from clients for a unique URL per city.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const cityParam = url.searchParams.get("city") || "nyc";
  const city = getPickerCity(cityParam);
  if (!city?.served || !city.cityCode) {
    return NextResponse.json(
      { ok: false, error: "City not available" },
      { status: 404 },
    );
  }

  // Non-blocking freshness — never delay the teaser on sync.
  void ensureMapDataFresh().catch(() => {});

  const projects = await listProjects({ city: city.cityCode });
  const valid = projects.filter((p) =>
    isValidTeaserCoord(p.latitude, p.longitude, city),
  );
  const pins = valid.slice(0, TEASER_PIN_LIMIT).map((p) => ({
    id: p.id,
    latitude: p.latitude,
    longitude: p.longitude,
    label: projectTeaserLabel(p.jobType, p.occupancy, p.buildingType),
  }));

  return NextResponse.json(
    {
      ok: true,
      city: city.id,
      totalCount: valid.length,
      pins,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        "Netlify-Vary": "query=city",
        Vary: "Accept-Encoding",
      },
    },
  );
}
