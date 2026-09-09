import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { allowedZipFilter } from "@/lib/db/types";
import { listMapPins } from "@/lib/map/pins";

export const dynamic = "force-dynamic";

/**
 * Authenticated map pin feed.
 * Query: city, west,south,east,north (bbox), limit
 * Cached briefly via Cache-Control for repeat pans.
 * Does not run freshness sync — that belongs on the map page `after()`.
 * Pins are filtered by the user's zipCodes allowlist for trial/starter/growth
 * when set; Pro and empty (grandfathered) lists are unrestricted.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const city = url.searchParams.get("city") || undefined;
  const limit = Number(url.searchParams.get("limit") || "350");
  const w = url.searchParams.get("west");
  const s = url.searchParams.get("south");
  const e = url.searchParams.get("east");
  const n = url.searchParams.get("north");

  let bbox: [number, number, number, number] | undefined;
  if (w && s && e && n) {
    const west = Number(w);
    const south = Number(s);
    const east = Number(e);
    const north = Number(n);
    if (
      [west, south, east, north].every((v) => Number.isFinite(v)) &&
      west < east &&
      south < north
    ) {
      bbox = [west, south, east, north];
    }
  }

  const started = Date.now();
  const zipCodes = allowedZipFilter(user);
  const result = await listMapPins({
    city,
    bbox,
    limit: Number.isFinite(limit) ? Math.min(limit, 400) : 350,
    zipCodes,
  });

  return NextResponse.json(
    {
      ok: true,
      city: city ?? null,
      bbox: bbox ?? null,
      count: result.pins.length,
      totalMatched: result.totalMatched,
      truncated: result.truncated,
      elapsedMs: Date.now() - started,
      zipFiltered: Boolean(zipCodes?.length),
      pins: result.pins,
    },
    {
      headers: {
        // Short SWR-style cache for pan/zoom repeats within the same session edge
        "Cache-Control": "private, max-age=30, stale-while-revalidate=90",
      },
    },
  );
}
