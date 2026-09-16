import { NextResponse } from "next/server";
import {
  getPickerCity,
  TEASER_PIN_LIMIT,
} from "@/lib/cities/picker";
import { listProjects } from "@/lib/db/store";
import { ensureMapDataFresh } from "@/lib/map/ensure-fresh";

export const dynamic = "force-dynamic";

/**
 * Public teaser pin feed for the marketing home map.
 * Returns a capped set of rough locations — no scores, contacts, or values.
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

  // Best-effort freshness — don't block forever on sync.
  try {
    await Promise.race([
      ensureMapDataFresh(),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {
    // continue with whatever is in the store
  }

  const projects = await listProjects({ city: city.cityCode });
  const pins = projects.slice(0, TEASER_PIN_LIMIT).map((p) => ({
    id: p.id,
    latitude: p.latitude,
    longitude: p.longitude,
  }));

  return NextResponse.json(
    {
      ok: true,
      city: city.id,
      totalCount: projects.length,
      pins,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
