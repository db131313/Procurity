import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getProject } from "@/lib/db/store";
import {
  findNearbyMapillaryImage,
  googleStreetViewStaticUrl,
  mapillaryThumbUrl,
} from "@/lib/geo/street-view";
import { readTeaserViewIds } from "@/lib/teaser/view-cookie";
import { clientIp, rateLimitOk } from "@/lib/teaser/rate-limit";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
};

/**
 * Proxies Street View / Mapillary bytes so API keys stay server-side.
 * Anonymous callers must pass projectId unlocked in the teaser cookie.
 * Lat/lng alone is never enough when logged out.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  const url = new URL(request.url);
  const projectId = (url.searchParams.get("projectId") || "").trim();

  if (!user) {
    if (!projectId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const viewed = await readTeaserViewIds();
    if (!viewed.includes(projectId)) {
      return NextResponse.json(
        { error: "Project not unlocked" },
        { status: 403 },
      );
    }
    const ip = clientIp(request);
    if (!rateLimitOk(`sv:img:ip:${ip}`, 40, 60_000)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }
  }

  const provider =
    url.searchParams.get("provider")?.trim().toLowerCase() ||
    (url.searchParams.get("id") ? "mapillary" : null);

  if (provider === "google") {
    let lat = Number(url.searchParams.get("lat"));
    let lng = Number(url.searchParams.get("lng"));
    const pano = url.searchParams.get("pano")?.trim() || null;

    // Anonymous: always resolve coords from the unlocked project (ignore spoofed lat/lng)
    if (!user && projectId) {
      const project = await getProject(projectId);
      if (!project) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      lat = project.latitude;
      lng = project.longitude;
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { error: "lat/lng required for google" },
        { status: 400 },
      );
    }
    const upstreamUrl = googleStreetViewStaticUrl(lat, lng, {
      width: 640,
      height: 400,
      panoId: pano,
    });
    if (!upstreamUrl) {
      return new NextResponse(null, { status: 503 });
    }
    const upstream = await fetch(upstreamUrl, { next: { revalidate: 86400 } });
    if (!upstream.ok) {
      return new NextResponse(null, {
        status: upstream.status === 404 ? 404 : 502,
      });
    }
    const buf = await upstream.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "image/jpeg",
        ...CACHE_HEADERS,
      },
    });
  }

  // Mapillary (default / legacy)
  let imageId = url.searchParams.get("id")?.trim() || "";

  if (!imageId) {
    let lat = Number(url.searchParams.get("lat"));
    let lng = Number(url.searchParams.get("lng"));
    if (!user && projectId) {
      const project = await getProject(projectId);
      if (!project) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      lat = project.latitude;
      lng = project.longitude;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { error: "id or lat/lng required" },
        { status: 400 },
      );
    }
    const nearby = await findNearbyMapillaryImage(lat, lng);
    imageId = nearby?.id || "";
  }

  if (!imageId) {
    return new NextResponse(null, { status: 404 });
  }

  const thumbUrl = await mapillaryThumbUrl(imageId);
  if (!thumbUrl) {
    return new NextResponse(null, { status: 404 });
  }

  const upstream = await fetch(thumbUrl, { next: { revalidate: 86400 } });
  if (!upstream.ok) {
    return new NextResponse(null, { status: 502 });
  }

  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "image/jpeg",
      ...CACHE_HEADERS,
    },
  });
}
