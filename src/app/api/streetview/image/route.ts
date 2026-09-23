import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  findNearbyMapillaryImage,
  googleStreetViewStaticUrl,
  mapillaryThumbUrl,
} from "@/lib/geo/street-view";

export const dynamic = "force-dynamic";

/**
 * Proxies Street View / Mapillary bytes so API keys stay server-side.
 * ?provider=google&lat=&lng=[&pano=]  |  ?provider=mapillary&id=  | legacy ?id=
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const provider =
    url.searchParams.get("provider")?.trim().toLowerCase() ||
    (url.searchParams.get("id") ? "mapillary" : null);

  if (provider === "google") {
    const lat = Number(url.searchParams.get("lat"));
    const lng = Number(url.searchParams.get("lng"));
    const pano = url.searchParams.get("pano")?.trim() || null;
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
    const upstream = await fetch(upstreamUrl, { next: { revalidate: 3600 } });
    if (!upstream.ok) {
      return new NextResponse(null, { status: upstream.status === 404 ? 404 : 502 });
    }
    const buf = await upstream.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  // Mapillary (default / legacy)
  let imageId = url.searchParams.get("id")?.trim() || "";

  if (!imageId) {
    const lat = Number(url.searchParams.get("lat"));
    const lng = Number(url.searchParams.get("lng"));
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

  const upstream = await fetch(thumbUrl, { next: { revalidate: 3600 } });
  if (!upstream.ok) {
    return new NextResponse(null, { status: 502 });
  }

  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
