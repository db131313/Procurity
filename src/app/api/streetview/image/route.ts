import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  fetchStreetViewMeta,
  streetViewImageUrl,
} from "@/lib/geo/street-view";

export const dynamic = "force-dynamic";

/** Proxies Street View Static image so the API key stays server-side. */
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

  const meta = await fetchStreetViewMeta(lat, lng);
  if (!meta.available) {
    return new NextResponse(null, { status: 404 });
  }

  const imageUrl = streetViewImageUrl(lat, lng);
  if (!imageUrl) {
    return new NextResponse(null, { status: 404 });
  }

  const upstream = await fetch(imageUrl, { next: { revalidate: 86400 } });
  if (!upstream.ok) {
    return new NextResponse(null, { status: 502 });
  }

  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "image/jpeg",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
