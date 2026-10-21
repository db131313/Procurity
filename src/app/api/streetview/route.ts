import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getProject } from "@/lib/db/store";
import {
  fetchStreetViewMeta,
  formatStreetViewDate,
  googleStreetViewReportUrl,
  isStreetViewConfigured,
  mapillaryAppUrl,
} from "@/lib/geo/street-view";
import { readTeaserViewIds } from "@/lib/teaser/view-cookie";
import { clientIp, rateLimitOk } from "@/lib/teaser/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Street imagery metadata + proxied image URL for project overlays.
 * Prefer Google Street View; fall back to Mapillary.
 *
 * Auth:
 * - Logged-in users: any lat/lng
 * - Anonymous: only with ?projectId= that is in the signed teaser cookie
 *   (one of their 3 free views). Never by arbitrary lat/lng alone.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  const url = new URL(request.url);
  const projectId = (url.searchParams.get("projectId") || "").trim();

  let lat = Number(url.searchParams.get("lat"));
  let lng = Number(url.searchParams.get("lng"));

  if (!user) {
    if (!projectId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const viewed = await readTeaserViewIds();
    if (!viewed.includes(projectId)) {
      return NextResponse.json(
        { error: "Project not unlocked", code: "not_unlocked" },
        { status: 403 },
      );
    }
    const ip = clientIp(request);
    if (!rateLimitOk(`sv:meta:ip:${ip}`, 60, 60_000)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }
    if (!rateLimitOk(`sv:meta:cookie:${viewed.join(",")}`, 90, 60_000)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    lat = project.latitude;
    lng = project.longitude;
  }

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
    if (projectId) qs.set("projectId", projectId);
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

  const qs = new URLSearchParams({
    provider: "mapillary",
    id: meta.imageId,
  });
  if (projectId) qs.set("projectId", projectId);
  const imagePath = `/api/streetview/image?${qs.toString()}`;

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
