/** Shared daily-route types (API + MapView + RoutePlanner). */

export type RouteStop = {
  id: string;
  visitOrder: number;
  address: string;
  score: number;
  buyingWindowEstimate: string;
  borough: string | null;
  zip: string | null;
  city: string;
  latitude: number;
  longitude: number;
  estValueLow: number;
  estValueHigh: number;
  milesFromPrev: number;
  navigateUrl: string;
};

export type RouteResult = {
  ok: boolean;
  mode: "near" | "zip";
  stops: RouteStop[];
  stopCount: number;
  fullRouteUrl: string | null;
  start?: { latitude: number; longitude: number };
  message?: string;
  city?: string;
  zip?: string;
  usedGeolocation?: boolean;
  error?: string;
};

/** sessionStorage key: hand a generated route from /app/route onto the map. */
export const MAP_ROUTE_KEY = "pc_daily_route_v1";

export function saveMapRoute(result: RouteResult) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(MAP_ROUTE_KEY, JSON.stringify(result));
  } catch {
    // ignore quota
  }
}

export function loadMapRoute(): RouteResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(MAP_ROUTE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RouteResult;
  } catch {
    return null;
  }
}

export function clearMapRoute() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(MAP_ROUTE_KEY);
  } catch {
    // ignore
  }
}
