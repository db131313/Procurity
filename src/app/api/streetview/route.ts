import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  fetchStreetViewMeta,
  formatStreetViewDate,
  googleStreetViewReportUrl,
  isStreetViewConfigured,
  mapillaryAppUrl,
} from "@/lib/geo/street-view";

export const dynamic = "force-dynamic";

/**
 * Street imagery metadata + proxied image URL for project overlays.
 * Prefer Google Street View; fall back to Mapillary. Auth required.
 * Returns available:false (not an error) when no keys / no coverage.
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
      attribution: null,
      provider: null,
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
      attribution: null,
      provider: meta.provider ?? null,
      status: meta.status,
    });
  }

  if (meta.provider === "google") {
    const qs = new URLSearchParams({
      provider: "google",
      lat: String(lat),
      lng: String(lng),
    });
    if (meta.panoId) qs.set("pano", meta.panoId);
    return NextResponse.json({
      ok: true,
      configured: true,
      available: true,
      date: meta.date,
      dateLabel: formatStreetViewDate(meta.date),
      imagePath: `/api/streetview/image?${qs.toString()}`,
      reportProblemUrl: googleStreetViewReportUrl(lat, lng),
      attribution: "Google",
      provider: "google",
      status: meta.status,
    });
  }

  // Mapillary
  if (!meta.imageId) {
    return NextResponse.json({
      ok: true,
      configured: true,
      available: false,
      date: null,
      dateLabel: null,
      imagePath: null,
      reportProblemUrl: null,
      attribution: null,
      provider: "mapillary",
      status: meta.status || "NO_IMAGERY",
    });
  }

  const imagePath = `/api/streetview/image?provider=mapillary&id=${encodeURIComponent(meta.imageId)}`;

  return NextResponse.json({
    ok: true,
    configured: true,
    available: true,
    date: meta.date,
    dateLabel: formatStreetViewDate(meta.date),
    imagePath,
    imageId: meta.imageId,
    reportProblemUrl: mapillaryAppUrl(meta.imageId),
    attribution: "Mapillary",
    provider: "mapillary",
    status: meta.status,
  });
}
