/**
 * Mapillary street-imagery helpers (replaces Google Street View Static).
 * Requires MAPILLARY_ACCESS_TOKEN (server-only).
 * When unset or no nearby coverage, callers show a clean fallback — never a broken image.
 */

export type StreetViewMeta = {
  available: boolean;
  /** Capture date label seed, e.g. "2023-05" */
  date: string | null;
  status: string;
  /** Mapillary image id when available */
  imageId?: string | null;
};

function mapillaryToken(): string | null {
  const key =
    process.env.MAPILLARY_ACCESS_TOKEN?.trim() ||
    process.env.MAPILLARY_TOKEN?.trim();
  return key || null;
}

export function isStreetViewConfigured(): boolean {
  return Boolean(mapillaryToken());
}

/** Format "2023-05" → "May 2023" */
export function formatStreetViewDate(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const m = /^(\d{4})(?:-(\d{2}))?/.exec(raw.trim());
  if (!m) return raw;
  const year = m[1]!;
  const month = m[2] ? Number(m[2]) : null;
  if (!month || month < 1 || month > 12) return year;
  const label = new Date(Date.UTC(Number(year), month - 1, 1)).toLocaleString(
    "en-US",
    { month: "long", timeZone: "UTC" },
  );
  return `${label} ${year}`;
}

function dateKeyFromMs(ms: number | null | undefined): string | null {
  if (ms == null || !Number.isFinite(ms)) return null;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

type MapillaryImage = {
  id: string;
  captured_at?: number;
  thumb_1024_url?: string;
  thumb_2048_url?: string;
  geometry?: { type: string; coordinates: [number, number] };
};

function haversineM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function mapillaryGet(
  path: string,
  params: Record<string, string>,
): Promise<Response | null> {
  const token = mapillaryToken();
  if (!token) return null;
  const url = new URL(`https://graph.mapillary.com${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", token);
  try {
    return await fetch(url.toString(), {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    });
  } catch {
    return null;
  }
}

/** Best image within Mapillary's 50 m radius search (preferred). */
async function searchRadius(
  lat: number,
  lng: number,
): Promise<MapillaryImage | null> {
  const res = await mapillaryGet("/images", {
    fields: "id,captured_at,thumb_1024_url,thumb_2048_url,geometry",
    lat: String(lat),
    lng: String(lng),
    radius: "50",
    limit: "1",
  });
  if (!res?.ok) return null;
  const body = (await res.json()) as { data?: MapillaryImage[] };
  return body.data?.[0] ?? null;
}

/**
 * Fallback: small bbox (~±90 m) and pick closest image.
 * Used when radius-50 returns nothing (common for setback addresses).
 */
async function searchBboxClosest(
  lat: number,
  lng: number,
): Promise<MapillaryImage | null> {
  const d = 0.00085; // ~95 m
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
  const res = await mapillaryGet("/images", {
    fields: "id,captured_at,thumb_1024_url,thumb_2048_url,geometry",
    bbox,
    limit: "20",
  });
  if (!res?.ok) return null;
  const body = (await res.json()) as { data?: MapillaryImage[] };
  const list = body.data ?? [];
  if (!list.length) return null;
  let best: MapillaryImage | null = null;
  let bestDist = Infinity;
  for (const img of list) {
    const coords = img.geometry?.coordinates;
    if (!coords) continue;
    const dist = haversineM(lat, lng, coords[1], coords[0]);
    if (dist < bestDist) {
      bestDist = dist;
      best = img;
    }
  }
  return best ?? list[0] ?? null;
}

export async function findNearbyMapillaryImage(
  lat: number,
  lng: number,
): Promise<MapillaryImage | null> {
  if (!mapillaryToken()) return null;
  const near = await searchRadius(lat, lng);
  if (near) return near;
  return searchBboxClosest(lat, lng);
}

export async function fetchStreetViewMeta(
  lat: number,
  lng: number,
): Promise<StreetViewMeta> {
  if (!mapillaryToken()) {
    return { available: false, date: null, status: "NO_KEY", imageId: null };
  }
  try {
    const img = await findNearbyMapillaryImage(lat, lng);
    if (!img?.id) {
      return {
        available: false,
        date: null,
        status: "NO_IMAGERY",
        imageId: null,
      };
    }
    return {
      available: true,
      date: dateKeyFromMs(img.captured_at),
      status: "OK",
      imageId: img.id,
    };
  } catch {
    return { available: false, date: null, status: "ERROR", imageId: null };
  }
}

/** Resolve a thumbnail URL for a known Mapillary image id (server-side). */
export async function mapillaryThumbUrl(
  imageId: string,
): Promise<string | null> {
  if (!mapillaryToken() || !imageId) return null;
  const res = await mapillaryGet(`/${encodeURIComponent(imageId)}`, {
    fields: "id,thumb_1024_url,thumb_2048_url",
  });
  if (!res?.ok) return null;
  const body = (await res.json()) as MapillaryImage;
  return body.thumb_2048_url || body.thumb_1024_url || null;
}

export function mapillaryAppUrl(imageId: string): string {
  return `https://www.mapillary.com/app/?pKey=${encodeURIComponent(imageId)}`;
}
