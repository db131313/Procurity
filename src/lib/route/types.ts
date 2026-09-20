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
  /** Set by Plan My Day orchestration — short agent framing for the map. */
  agentMessage?: string;
};

/** Default stop cap for agent Plan My Day (8 stops + origin ≈ Maps limit). */
export const PLAN_MY_DAY_STOP_LIMIT = 8;

export function buildAgentRouteMessage(result: {
  stopCount: number;
  mode: "near" | "zip";
  zip?: string;
}): string {
  const n = result.stopCount;
  if (result.mode === "zip" && result.zip) {
    return `Found ${n} strong opportunities in ${result.zip} today`;
  }
  return `Found ${n} strong opportunities near you today`;
}

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
