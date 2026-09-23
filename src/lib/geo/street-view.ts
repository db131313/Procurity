/**
 * Street imagery: Google Street View Static (primary) + Mapillary (fallback).
 * Keys stay server-only. When neither has coverage, callers show a clean empty state.
 */

export type StreetViewProvider = "google" | "mapillary";

export type StreetViewMeta = {
  available: boolean;
  /** Capture date label seed, e.g. "2023-05" */
  date: string | null;
  status: string;
  provider?: StreetViewProvider | null;
  /** Mapillary image id when provider is mapillary */
  imageId?: string | null;
  /** Google pano id when available (optional) */
  panoId?: string | null;
};

function mapillaryToken(): string | null {
  const key =
    process.env.MAPILLARY_ACCESS_TOKEN?.trim() ||
    process.env.MAPILLARY_TOKEN?.trim();
  return key || null;
}

function googleMapsApiKey(): string | null {
  const key =
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_STREET_VIEW_API_KEY?.trim();
  return key || null;
}

export function isGoogleStreetViewConfigured(): boolean {
  return Boolean(googleMapsApiKey());
}

export function isMapillaryConfigured(): boolean {
  return Boolean(mapillaryToken());
}

/** True if either Google or Mapillary can serve imagery. */
export function isStreetViewConfigured(): boolean {
  return isGoogleStreetViewConfigured() || isMapillaryConfigured();
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

type GoogleMetaResponse = {
  status?: string;
  date?: string;
  pano_id?: string;
  copyright?: string;
};

/**
 * Free Google Street View metadata check (no image bill until Static fetch).
 * https://developers.google.com/maps/documentation/streetview/metadata
 */
export async function fetchGoogleStreetViewMeta(
  lat: number,
  lng: number,
): Promise<StreetViewMeta> {
  const key = googleMapsApiKey();
  if (!key) {
    return {
      available: false,
      date: null,
      status: "NO_KEY",
      provider: null,
    };
  }
  try {
    const url = new URL(
      "https://maps.googleapis.com/maps/api/streetview/metadata",
    );
    url.searchParams.set("location", `${lat},${lng}`);
    url.searchParams.set("source", "outdoor");
    url.searchParams.set("key", key);
    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return {
        available: false,
        date: null,
        status: "ERROR",
        provider: "google",
      };
    }
    const body = (await res.json()) as GoogleMetaResponse;
    if (body.status !== "OK") {
      return {
        available: false,
        date: null,
        status: body.status || "NO_IMAGERY",
        provider: "google",
      };
    }
    return {
      available: true,
      date: body.date || null,
      status: "OK",
      provider: "google",
      panoId: body.pano_id || null,
    };
  } catch {
    return {
      available: false,
      date: null,
      status: "ERROR",
      provider: "google",
    };
  }
}

export async function fetchMapillaryStreetViewMeta(
  lat: number,
  lng: number,
): Promise<StreetViewMeta> {
  if (!mapillaryToken()) {
    return {
      available: false,
      date: null,
      status: "NO_KEY",
      provider: null,
      imageId: null,
    };
  }
  try {
    const img = await findNearbyMapillaryImage(lat, lng);
    if (!img?.id) {
      return {
        available: false,
        date: null,
        status: "NO_IMAGERY",
        provider: "mapillary",
        imageId: null,
      };
    }
    return {
      available: true,
      date: dateKeyFromMs(img.captured_at),
      status: "OK",
      provider: "mapillary",
      imageId: img.id,
    };
  } catch {
    return {
      available: false,
      date: null,
      status: "ERROR",
      provider: "mapillary",
      imageId: null,
    };
  }
}

/**
 * Preferred chain: Google first, Mapillary if Google has no coverage / no key.
 */
export async function fetchStreetViewMeta(
  lat: number,
  lng: number,
): Promise<StreetViewMeta> {
  let googleResult: StreetViewMeta | null = null;
  if (isGoogleStreetViewConfigured()) {
    googleResult = await fetchGoogleStreetViewMeta(lat, lng);
    if (googleResult.available) return googleResult;
  }
  if (isMapillaryConfigured()) {
    return fetchMapillaryStreetViewMeta(lat, lng);
  }
  if (googleResult) {
    // Google configured but no imagery (and no Mapillary) — preserve status.
    return googleResult;
  }
  return {
    available: false,
    date: null,
    status: "NO_KEY",
    provider: null,
  };
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

/** Google “Report a problem” / Street View deep link (required attribution UI). */
export function googleStreetViewReportUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${encodeURIComponent(`${lat},${lng}`)}`;
}

/**
 * Upstream Google Static Street View URL (server-side only — includes API key).
 * Prefer proxying via /api/streetview/image so the key never reaches the browser.
 */
export function googleStreetViewStaticUrl(
  lat: number,
  lng: number,
  opts?: { width?: number; height?: number; panoId?: string | null },
): string | null {
  const key = googleMapsApiKey();
  if (!key) return null;
  const w = Math.min(Math.max(opts?.width ?? 640, 100), 640);
  const h = Math.min(Math.max(opts?.height ?? 400, 100), 640);
  const url = new URL("https://maps.googleapis.com/maps/api/streetview");
  url.searchParams.set("size", `${w}x${h}`);
  url.searchParams.set("fov", "90");
  url.searchParams.set("pitch", "0");
  url.searchParams.set("source", "outdoor");
  url.searchParams.set("return_error_code", "true");
  if (opts?.panoId) {
    url.searchParams.set("pano", opts.panoId);
  } else {
    url.searchParams.set("location", `${lat},${lng}`);
  }
  url.searchParams.set("key", key);
  return url.toString();
}
