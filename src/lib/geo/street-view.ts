/**
 * Google Street View helpers.
 * Requires GOOGLE_MAPS_API_KEY (Maps Static + Street View Static APIs enabled).
 * When unset, callers should show a clean fallback — never a broken image.
 */

export type StreetViewMeta = {
  available: boolean;
  /** Capture date from metadata, e.g. "2023-05" or "2023" */
  date: string | null;
  status: string;
};

function mapsKey(): string | null {
  const key =
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  return key || null;
}

export function isStreetViewConfigured(): boolean {
  return Boolean(mapsKey());
}

/** Format metadata date for display: "2023-05" → "May 2023" */
export function formatStreetViewDate(raw: string | null | undefined): string | null {
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

export async function fetchStreetViewMeta(
  lat: number,
  lng: number,
): Promise<StreetViewMeta> {
  const key = mapsKey();
  if (!key) {
    return { available: false, date: null, status: "NO_KEY" };
  }
  const url = new URL(
    "https://maps.googleapis.com/maps/api/streetview/metadata",
  );
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("key", key);
  try {
    const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
    const data = (await res.json()) as {
      status?: string;
      date?: string;
    };
    const status = data.status || "UNKNOWN";
    if (status !== "OK") {
      return { available: false, date: null, status };
    }
    return {
      available: true,
      date: data.date ?? null,
      status,
    };
  } catch {
    return { available: false, date: null, status: "ERROR" };
  }
}

/** Build Static Street View image URL (server-side; key never sent to browser). */
export function streetViewImageUrl(
  lat: number,
  lng: number,
  size = "640x320",
): string | null {
  const key = mapsKey();
  if (!key) return null;
  const url = new URL("https://maps.googleapis.com/maps/api/streetview");
  url.searchParams.set("size", size);
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("fov", "80");
  url.searchParams.set("pitch", "0");
  url.searchParams.set("key", key);
  return url.toString();
}
