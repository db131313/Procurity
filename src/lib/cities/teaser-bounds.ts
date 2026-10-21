import type { PickerCity } from "./picker";

/** Rough geographic bounds for teaser pin validation (degrees). */
export type LatLngBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

const BOUNDS: Record<string, LatLngBounds> = {
  nyc: { minLat: 40.45, maxLat: 41.0, minLng: -74.35, maxLng: -73.65 },
  chicago: { minLat: 41.6, maxLat: 42.1, minLng: -88.0, maxLng: -87.4 },
  los_angeles: { minLat: 33.6, maxLat: 34.4, minLng: -118.7, maxLng: -117.9 },
  san_francisco: { minLat: 37.65, maxLat: 37.85, minLng: -122.55, maxLng: -122.3 },
  seattle: { minLat: 47.45, maxLat: 47.75, minLng: -122.45, maxLng: -122.15 },
  boston: { minLat: 42.2, maxLat: 42.45, minLng: -71.25, maxLng: -70.9 },
  fort_worth: { minLat: 32.55, maxLat: 33.05, minLng: -97.55, maxLng: -97.1 },
  miami_dade: { minLat: 25.3, maxLat: 26.0, minLng: -80.6, maxLng: -80.05 },
};

export function boundsForCity(city: PickerCity): LatLngBounds {
  if (BOUNDS[city.id]) return BOUNDS[city.id]!;
  const [lng, lat] = city.center;
  return {
    minLat: lat - 0.35,
    maxLat: lat + 0.35,
    minLng: lng - 0.45,
    maxLng: lng + 0.45,
  };
}

export function isValidTeaserCoord(
  lat: number | null | undefined,
  lng: number | null | undefined,
  city: PickerCity,
): boolean {
  if (lat == null || lng == null) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
  const b = boundsForCity(city);
  return (
    lat >= b.minLat &&
    lat <= b.maxLat &&
    lng >= b.minLng &&
    lng <= b.maxLng
  );
}
