import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  findNearbyMapillaryImage,
  mapillaryThumbUrl,
} from "@/lib/geo/street-view";

export const dynamic = "force-dynamic";

/** Proxies a Mapillary thumbnail so the access token stays server-side. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
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
