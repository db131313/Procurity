export type MapCamera = {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
};

export const MAP_CAMERA_KEY = "pc_map_camera_v2";

/**
 * Fallback camera when fitBounds isn't available yet.
 * Intentionally wide (zoom ~9.6) so all five boroughs are in frame —
 * the old default (zoom 10.5 @ Williamsburg) cropped to ~Brooklyn-only.
 */
export const DEFAULT_MAP_CAMERA: MapCamera = {
  center: [-73.98, 40.71],
  zoom: 9.6,
  pitch: 30,
  bearing: -12,
};

function isCamera(value: unknown): value is MapCamera {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const center = v.center;
  return (
    Array.isArray(center) &&
    center.length === 2 &&
    typeof center[0] === "number" &&
    typeof center[1] === "number" &&
    typeof v.zoom === "number" &&
    typeof v.pitch === "number" &&
    typeof v.bearing === "number"
  );
}

/** SSR-safe read of the last map camera from sessionStorage. */
export function getMapCamera(): MapCamera | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(MAP_CAMERA_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isCamera(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** SSR-safe write of the current map camera to sessionStorage. */
export function setMapCamera(camera: MapCamera): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(MAP_CAMERA_KEY, JSON.stringify(camera));
  } catch {
    // Quota / private mode — ignore
  }
}

/** Clear saved camera (e.g. when switching metro so we re-fit city bounds). */
export function clearMapCamera(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(MAP_CAMERA_KEY);
  } catch {
    // ignore
  }
}
