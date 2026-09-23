"use client";

import { useEffect, useState, useTransition } from "react";
import { Route as RouteIcon, X } from "lucide-react";
import { WorkingSpinner } from "@/components/ui/WorkingIndicator";
import { PICKER_CITIES } from "@/lib/cities/picker";
import { METRO_ZIP_OPTIONS } from "@/lib/geo/zip-to-metro";
import { cn } from "@/lib/cn";
import {
  clearMapRoute,
  saveMapRoute,
  type RouteResult,
} from "@/lib/route/types";

const SERVED = PICKER_CITIES.filter((c) => c.served && c.cityCode);
const STOP_OPTIONS = [5, 8, 10, 12];

type Props = {
  city: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: RouteResult | null;
  onRouteChange: (route: RouteResult | null) => void;
};

/**
 * Floating Route control on the map — generate near-me / by-zip routes
 * and paint them on the same MapLibre map.
 */
export function MapRoutePanel({
  city,
  open,
  onOpenChange,
  route,
  onRouteChange,
}: Props) {
  const [mode, setMode] = useState<"near" | "zip">("near");
  const [metro, setMetro] = useState(city || "nyc");
  const [zip, setZip] = useState("");
  const [limit, setLimit] = useState(8);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (city) setMetro(city);
  }, [city]);

  function generate() {
    setError(null);
    startTransition(async () => {
      let latitude: number | undefined;
      let longitude: number | undefined;
      if (mode === "near" && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 8_000,
              maximumAge: 30_000,
            });
          });
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
        } catch {
          // city center fallback on server
        }
      }

      const res = await fetch("/api/route/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          mode,
          city: metro,
          zip,
          limit,
          latitude,
          longitude,
        }),
      });
      const data = (await res.json()) as RouteResult & { error?: string };
      if (!res.ok) {
        onRouteChange(null);
        clearMapRoute();
        setError(data.error || "Could not build route");
        return;
      }
      if (!data.stops?.length) {
        onRouteChange(null);
        clearMapRoute();
        setError(data.message || "No stops found");
        return;
      }
      saveMapRoute(data);
      onRouteChange(data);
      setError(null);
      // Stay on our map with the route drawn — Start FAB handles Maps handoff.
      onOpenChange(false);
    });
  }

  function clear() {
    onRouteChange(null);
    clearMapRoute();
    setError(null);
  }

  return (
    <div className="pointer-events-auto relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label="Daily route"
        onClick={() => onOpenChange(!open)}
        className={cn(
          "flex h-11 items-center gap-1.5 rounded-full border-2 px-3.5 text-sm font-bold shadow-md backdrop-blur transition",
          open || route
            ? "border-ink bg-ink text-white"
            : "border-line bg-white/95 text-ink",
        )}
      >
        <RouteIcon className="h-4 w-4 shrink-0" aria-hidden />
        <span>Route</span>
        {route ? (
          <span className="rounded-full bg-white/20 px-1.5 text-[10px]">
            {route.stopCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-40 mt-2 w-[min(92vw,20rem)] rounded-2xl border-2 border-line bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-ink">Plan today&apos;s route</p>
            <button
              type="button"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
              className="rounded-full p-1 text-slate hover:bg-offwhite"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex gap-1.5">
            {(
              [
                ["near", "Near me"],
                ["zip", "By zip"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={cn(
                  "h-9 flex-1 rounded-full text-xs font-bold",
                  mode === id
                    ? "bg-ink text-white"
                    : "border border-line text-slate",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "near" ? (
            <label className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-slate">
              Metro
              <select
                value={metro}
                onChange={(e) => setMetro(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-xl border border-line bg-white px-2 text-sm font-semibold text-ink"
              >
                {SERVED.map((c) => (
                  <option key={c.id} value={c.cityCode!}>
                    {c.shortLabel}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <label className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-slate">
                Zip
                <input
                  value={zip}
                  onChange={(e) =>
                    setZip(e.target.value.replace(/\D/g, "").slice(0, 5))
                  }
                  inputMode="numeric"
                  placeholder="10001"
                  className="mt-1 flex h-10 w-full rounded-xl border border-line bg-white px-2 text-sm font-semibold text-ink"
                />
              </label>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {METRO_ZIP_OPTIONS.flatMap((m) => m.zips.slice(0, 2)).map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setZip(z)}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                      zip === z
                        ? "border-ink bg-ink text-white"
                        : "border-line text-slate",
                    )}
                  >
                    {z}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="mt-3 flex gap-1">
            {STOP_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setLimit(n)}
                className={cn(
                  "h-8 flex-1 rounded-full text-xs font-bold",
                  limit === n
                    ? "bg-ink text-white"
                    : "border border-line text-slate",
                )}
              >
                {n}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={pending || (mode === "zip" && zip.length !== 5)}
            onClick={generate}
            className="pc-gradient-bg mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-bold text-white disabled:opacity-50"
            aria-busy={pending || undefined}
          >
            {pending ? <WorkingSpinner /> : null}
            {pending ? "Building…" : "Generate on map"}
          </button>

          {route ? (
            <button
              type="button"
              onClick={clear}
              className="mt-2 w-full text-center text-xs font-semibold text-slate underline"
            >
              Clear route
            </button>
          ) : null}

          {error ? (
            <p className="mt-2 text-xs font-medium text-slate">{error}</p>
          ) : null}

          {route && route.stops.length > 0 ? (
            <ol className="mt-3 max-h-40 space-y-1.5 overflow-y-auto border-t border-line pt-2">
              {route.stops.map((s) => (
                <li
                  key={s.id}
                  className="flex items-start gap-2 text-[11px] leading-snug"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">
                    {s.visitOrder}
                  </span>
                  <span className="min-w-0">
                    <span className="font-bold text-ink">{s.address}</span>
                    <span className="block text-slate">
                      Score {s.score} · {s.buyingWindowEstimate}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
