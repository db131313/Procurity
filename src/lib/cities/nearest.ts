import { DEFAULT_CITY_ID, PICKER_CITIES, type PickerCity } from "./picker";

const SERVED = PICKER_CITIES.filter((c) => c.served && c.cityCode);

/** Haversine distance in km. */
function distKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Served city whose map center is nearest to the given point. */
export function nearestServedCity(
  lat: number,
  lon: number,
): PickerCity {
  let best = SERVED[0]!;
  let bestD = Infinity;
  for (const city of SERVED) {
    const [clng, clat] = city.center;
    const d = distKm({ lat, lon }, { lat: clat, lon: clng });
    if (d < bestD) {
      bestD = d;
      best = city;
    }
  }
  return best;
}

/**
 * Resolve opening city from Netlify / CDN geo headers, then cookie, then NYC.
 * Does not request browser geolocation.
 */
export function resolveHomeCityId(opts: {
  headers: Headers;
  cookieCityId?: string | null;
  queryCityId?: string | null;
}): string {
  if (opts.queryCityId) {
    const q = SERVED.find((c) => c.id === opts.queryCityId);
    if (q) return q.id;
  }

  const lat = parseFloat(
    opts.headers.get("x-nf-latitude") ||
      opts.headers.get("x-vercel-ip-latitude") ||
      opts.headers.get("cf-iplatitude") ||
      "",
  );
  const lon = parseFloat(
    opts.headers.get("x-nf-longitude") ||
      opts.headers.get("x-vercel-ip-longitude") ||
      opts.headers.get("cf-iplongitude") ||
      "",
  );
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    return nearestServedCity(lat, lon).id;
  }

  // Netlify sometimes exposes a city name string
  const geoCity = (
    opts.headers.get("x-nf-city") ||
    opts.headers.get("x-vercel-ip-city") ||
    opts.headers.get("cf-ipcity") ||
    ""
  )
    .toLowerCase()
    .replace(/\+/g, " ");
  if (geoCity) {
    const match = SERVED.find(
      (c) =>
        c.label.toLowerCase() === geoCity ||
        c.shortLabel.toLowerCase() === geoCity ||
        c.id.replace(/_/g, " ") === geoCity,
    );
    if (match) return match.id;
  }

  if (opts.cookieCityId) {
    const c = SERVED.find((x) => x.id === opts.cookieCityId);
    if (c) return c.id;
  }

  return DEFAULT_CITY_ID;
}

export function servedPickerCities(): PickerCity[] {
  return SERVED;
}
