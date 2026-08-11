export type MapCamera = {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
};

export const MAP_CAMERA_KEY = "pc_map_camera";

/** NYC default — pitched 3D overview for first visit. */
export const DEFAULT_MAP_CAMERA: MapCamera = {
  center: [-73.94, 40.72],
  zoom: 10.5,
  pitch: 50,
  bearing: -20,
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
