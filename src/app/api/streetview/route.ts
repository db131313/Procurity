import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  fetchStreetViewMeta,
  formatStreetViewDate,
  isStreetViewConfigured,
  streetViewImageUrl,
} from "@/lib/geo/street-view";

export const dynamic = "force-dynamic";

/**
 * Street View metadata + proxied image URL for project overlays.
 * Auth required. Returns available:false (not an error) when no key / no imagery.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat/lng required" }, { status: 400 });
  }

  if (!isStreetViewConfigured()) {
    return NextResponse.json({
      ok: true,
      configured: false,
      available: false,
      date: null,
      dateLabel: null,
      imagePath: null,
      reportProblemUrl: null,
      status: "NO_KEY",
    });
  }

  const meta = await fetchStreetViewMeta(lat, lng);
  if (!meta.available) {
    return NextResponse.json({
      ok: true,
      configured: true,
      available: false,
      date: null,
      dateLabel: null,
      imagePath: null,
      reportProblemUrl: null,
      status: meta.status,
    });
  }

  const imagePath = `/api/streetview/image?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`;
  const reportProblemUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;

  return NextResponse.json({
    ok: true,
    configured: true,
    available: true,
    date: meta.date,
    dateLabel: formatStreetViewDate(meta.date),
    imagePath,
    reportProblemUrl,
    status: meta.status,
  });
}
