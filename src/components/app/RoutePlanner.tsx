"use client";

import { useEffect, useState, useTransition } from "react";
import { MapPinned, Navigation, Route as RouteIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { formatMoneyRange } from "@/lib/format";
import { PICKER_CITIES } from "@/lib/cities/picker";
import { METRO_ZIP_OPTIONS } from "@/lib/geo/zip-to-metro";
import { mapProjectHref } from "@/lib/map/project-href";
import { cn } from "@/lib/cn";
import Link from "next/link";

type Mode = "near" | "zip";

type RouteStop = {
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

type RouteResult = {
  ok: boolean;
  mode: Mode;
  stops: RouteStop[];
  stopCount: number;
  fullRouteUrl: string | null;
  message?: string;
  city?: string;
  zip?: string;
  usedGeolocation?: boolean;
  error?: string;
};

const SERVED = PICKER_CITIES.filter((c) => c.served && c.cityCode);
const STOP_OPTIONS = [5, 8, 10, 12];

type Props = {
  defaultCity: string;
};

export function RoutePlanner({ defaultCity }: Props) {
  const [mode, setMode] = useState<Mode>("near");
  const [city, setCity] = useState(defaultCity || "nyc");
  const [zip, setZip] = useState("");
  const [limit, setLimit] = useState(8);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [geoLabel, setGeoLabel] = useState<string>("Using city center");

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      () => setGeoLabel("Location available"),
      () => setGeoLabel("Using city center"),
      { maximumAge: 60_000, timeout: 4_000 },
    );
  }, []);

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
          setGeoLabel("Near your location");
        } catch {
          setGeoLabel("Using city center");
        }
      }

      const res = await fetch("/api/route/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          mode,
          city,
          zip,
          limit,
          latitude,
          longitude,
        }),
      });
      const data = (await res.json()) as RouteResult & { error?: string };
      if (!res.ok) {
        setResult(null);
        setError(data.error || "Could not build route");
        return;
      }
      setResult(data);
      if (data.message && !data.stops?.length) setError(data.message);
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-6 md:px-8 md:py-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-purple">
        Daily route
      </p>
      <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight text-ink md:text-3xl">
        <RouteIcon className="h-7 w-7 text-purple" aria-hidden />
        Plan today&apos;s visits
      </h1>
      <p className="mt-1 text-sm text-slate">
        Top Buy Score sites, ordered for an efficient drive — then hand off to
        Maps for turn-by-turn.
      </p>

      <div className="mt-5 flex gap-2">
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
              "h-11 flex-1 rounded-full text-sm font-bold transition",
              mode === id
                ? "bg-ink text-white"
                : "border border-line bg-white text-slate",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="pc-card mt-4 space-y-4 p-4">
        {mode === "near" ? (
          <>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate">
              Metro
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1.5 flex h-12 w-full rounded-xl border border-line bg-white px-3 text-sm font-semibold text-ink"
              >
                {SERVED.map((c) => (
                  <option key={c.id} value={c.cityCode!}>
                    {c.shortLabel}
                  </option>
                ))}
              </select>
            </label>
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate">
              <MapPinned className="h-3.5 w-3.5" aria-hidden />
              {geoLabel}
            </p>
          </>
        ) : (
          <>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate">
              Zip code
              <input
                value={zip}
                onChange={(e) =>
                  setZip(e.target.value.replace(/\D/g, "").slice(0, 5))
                }
                inputMode="numeric"
                placeholder="e.g. 10001"
                className="mt-1.5 flex h-12 w-full rounded-xl border border-line bg-white px-3 text-sm font-semibold text-ink"
              />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {METRO_ZIP_OPTIONS.flatMap((m) => m.zips.slice(0, 3)).map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZip(z)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-bold",
                    zip === z
                      ? "border-ink bg-ink text-white"
                      : "border-line bg-white text-slate",
                  )}
                >
                  {z}
                </button>
              ))}
            </div>
          </>
        )}

        <label className="block text-xs font-bold uppercase tracking-wide text-slate">
          Stops
          <div className="mt-1.5 flex gap-2">
            {STOP_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setLimit(n)}
                className={cn(
                  "h-10 flex-1 rounded-full text-sm font-bold",
                  limit === n
                    ? "bg-ink text-white"
                    : "border border-line bg-white text-slate",
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </label>

        <Button
          type="button"
          onClick={generate}
          disabled={pending || (mode === "zip" && zip.length !== 5)}
          className="h-14 w-full"
        >
          {pending ? "Building route…" : "Generate route"}
        </Button>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-dashed border-line bg-white px-3 py-3 text-sm text-slate">
          {error}
        </p>
      )}

      {result && result.stops.length > 0 && (
        <section className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-ink">
              {result.stopCount} stops
              {result.mode === "zip" && result.zip
                ? ` · ${result.zip}`
                : result.city
                  ? ` · ${result.city}`
                  : ""}
            </h2>
            {result.fullRouteUrl && (
              <a
                href={result.fullRouteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-xs font-bold text-ink"
              >
                <Navigation className="h-3.5 w-3.5" aria-hidden />
                Open full route
              </a>
            )}
          </div>

          <ol className="mt-3 space-y-3">
            {result.stops.map((stop) => (
              <li key={stop.id} className="pc-card flex gap-3 p-3">
                <div className="flex flex-col items-center gap-1">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
                    {stop.visitOrder}
                  </span>
                  <ScoreRing score={stop.score} size={44} stroke={4} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">
                    {stop.address}
                  </p>
                  <p className="mt-0.5 text-xs text-slate">
                    {[stop.borough, stop.zip].filter(Boolean).join(" · ")}
                    {stop.visitOrder > 1
                      ? ` · ${stop.milesFromPrev} mi from prior`
                      : " · start"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-ink">
                    {formatMoneyRange(stop.estValueLow, stop.estValueHigh)}
                    <span className="font-normal text-slate">
                      {" "}
                      · {stop.buyingWindowEstimate}
                    </span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a
                      href={stop.navigateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pc-gradient-bg inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold text-white"
                    >
                      <Navigation className="h-3.5 w-3.5" aria-hidden />
                      Navigate
                    </a>
                    <Link
                      href={mapProjectHref(stop.id, stop.city)}
                      className="inline-flex h-9 items-center rounded-full border border-line bg-white px-3 text-[11px] font-bold text-ink"
                    >
                      View on map
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
