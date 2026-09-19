/**
 * Deep links into the user's maps app for turn-by-turn directions.
 */

export type MapStop = {
  latitude: number;
  longitude: number;
  address?: string;
};

/** Single-stop navigate (Google Maps — works on iOS/Android/desktop). */
export function navigateToStopUrl(stop: MapStop): string {
  const params = new URLSearchParams({
    api: "1",
    destination: `${stop.latitude},${stop.longitude}`,
    travelmode: "driving",
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Apple Maps single-stop (useful on iOS). */
export function appleMapsStopUrl(stop: MapStop): string {
  const params = new URLSearchParams({
    daddr: `${stop.latitude},${stop.longitude}`,
    dirflg: "d",
  });
  if (stop.address) params.set("q", stop.address);
  return `https://maps.apple.com/?${params.toString()}`;
}

/**
 * Full multi-stop Google Maps route.
 * origin = first stop (or optional start), destination = last, waypoints = middle.
 */
export function navigateFullRouteUrl(
  stops: MapStop[],
  start?: MapStop | null,
): string | null {
  if (!stops.length) return null;
  const origin = start ?? stops[0]!;
  const destination = stops[stops.length - 1]!;
  const middle = start ? stops.slice(0, -1) : stops.slice(1, -1);
  const params = new URLSearchParams({
    api: "1",
    origin: `${origin.latitude},${origin.longitude}`,
    destination: `${destination.latitude},${destination.longitude}`,
    travelmode: "driving",
  });
  if (middle.length) {
    params.set(
      "waypoints",
      middle.map((s) => `${s.latitude},${s.longitude}`).join("|"),
    );
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
