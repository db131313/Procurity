"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  LngLatBounds,
} from "maplibre-gl";
import { PICKER_CITIES, type PickerCity } from "@/lib/cities/picker";
import { cn } from "@/lib/cn";
import { WorkingPill } from "@/components/ui/WorkingIndicator";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
  "https://tiles.openfreemap.org/styles/liberty";

type TeaserPin = {
  id: string;
  latitude: number;
  longitude: number;
  label?: string;
};

type Props = {
  initialCityId?: string;
};

const SERVED = PICKER_CITIES.filter((c) => c.served);

/**
 * Home teaser map: city chips fly the camera and reload that city's pins.
 * Always clears pins on switch; aborts in-flight fetches; fits bounds to results.
 */
export function HomeTeaserMapSection({ initialCityId = "nyc" }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const requestGen = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const [ready, setReady] = useState(false);
  const [cityId, setCityId] = useState(initialCityId);
  const [pins, setPins] = useState<TeaserPin[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const city: PickerCity =
    SERVED.find((c) => c.id === cityId) ?? SERVED[0]!;

  const loadPins = useCallback(async (id: string) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const gen = ++requestGen.current;

    setLoading(true);
    setError(null);
    setPins([]);
    setTotalCount(0);

    try {
      // Path-based URL so CDNs cannot mix cities (also Netlify-Vary on query route).
      const res = await fetch(`/api/teaser/pins/${encodeURIComponent(id)}`, {
        signal: ac.signal,
        cache: "no-store",
      });
      if (gen !== requestGen.current) return;
      if (!res.ok) {
        setError("We couldn't load projects for this city. Try again.");
        return;
      }
      const data = (await res.json()) as {
        ok?: boolean;
        city?: string;
        pins?: TeaserPin[];
        totalCount?: number;
      };
      if (gen !== requestGen.current) return;
      if (data.city && data.city !== id) {
        // Stale / mis-cached payload — ignore
        setError("That city's map didn't load correctly. Try again.");
        return;
      }
      const next = Array.isArray(data.pins) ? data.pins : [];
      setPins(next);
      setTotalCount(
        typeof data.totalCount === "number" ? data.totalCount : next.length,
      );
      if (!next.length) {
        setError("No projects to show here yet. Try another city.");
      }
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") return;
      if (gen !== requestGen.current) return;
      setError("We couldn't load projects for this city. Try again.");
    } finally {
      if (gen === requestGen.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPins(cityId);
    return () => {
      abortRef.current?.abort();
    };
  }, [cityId, loadPins]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;
    let map: MapLibreMap | null = null;

    const init = () => {
      if (cancelled || !containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      if (width < 2 || height < 2) {
        requestAnimationFrame(init);
        return;
      }

      map = new MapLibreMap({
        container: containerRef.current,
        style: STYLE_URL,
        center: city.center,
        zoom: city.zoom,
        maxPitch: 45,
        interactive: true,
      });
      map.addControl(
        new NavigationControl({ visualizePitch: false }),
        "top-right",
      );
      mapRef.current = map;

      map.on("load", () => {
        if (cancelled || !map) return;
        map.addSource("teaser-pins", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "teaser-pins-halo",
          type: "circle",
          source: "teaser-pins",
          paint: {
            "circle-radius": 10,
            "circle-color": "#2563EB",
            "circle-opacity": 0.25,
          },
        });
        map.addLayer({
          id: "teaser-pins",
          type: "circle",
          source: "teaser-pins",
          paint: {
            "circle-radius": 6,
            "circle-color": "#2563EB",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });
        setReady(true);
      });
    };

    const raf = requestAnimationFrame(init);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      map?.remove();
      mapRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  // Push pins + fit camera to their bounds (or city center when empty)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource("teaser-pins") as GeoJSONSource | undefined;
    if (!source) return;

    source.setData({
      type: "FeatureCollection",
      features: pins.map((p, i) => ({
        type: "Feature",
        // Numeric id preferred by MapLibre; keep string in properties
        id: i + 1,
        properties: { projectId: p.id, label: p.label || "" },
        geometry: {
          type: "Point",
          coordinates: [p.longitude, p.latitude],
        },
      })),
    });

    if (pins.length > 0) {
      const bounds = new LngLatBounds();
      for (const p of pins) bounds.extend([p.longitude, p.latitude]);
      map.fitBounds(bounds, {
        padding: 48,
        maxZoom: 13,
        duration: 900,
        essential: true,
      });
    } else {
      map.flyTo({
        center: city.center,
        zoom: city.zoom,
        duration: 900,
        essential: true,
      });
    }
  }, [pins, ready, city]);

  function selectCity(id: string) {
    if (id === cityId) {
      void loadPins(id);
      return;
    }
    setCityId(id);
  }

  return (
    <section className="bg-white px-5 py-16 md:px-10 md:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-bold tracking-tight text-ink md:text-4xl">
          Projects near you
        </h2>
        <p className="mt-3 max-w-xl text-slate">
          Pick a city to see example projects on the map. Sign up to unlock
          scores, contacts, and the full list.
        </p>

        <div className="relative mt-8 overflow-hidden rounded-3xl border border-line bg-[#dfe7ef] shadow-sm">
          <div
            ref={containerRef}
            className="h-[min(62dvh,480px)] w-full md:h-[520px]"
            aria-label={`Map of projects in ${city.label}`}
            role="application"
          />
          {loading && (
            <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
              <WorkingPill className="py-1.5 text-[11px] shadow-sm">
                Loading {city.shortLabel} projects…
              </WorkingPill>
            </div>
          )}
          {!loading && !error && totalCount > 0 && (
            <div className="pointer-events-none absolute left-3 top-3 z-10">
              <span className="rounded-full border border-line bg-white/95 px-3 py-1.5 text-[11px] font-bold text-ink shadow-sm">
                {city.label} · {totalCount.toLocaleString()} projects · preview
              </span>
            </div>
          )}
          {!loading && error && (
            <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center px-4">
              <div className="flex max-w-md flex-col items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-center shadow-sm">
                <p className="text-sm text-ink">{error}</p>
                <button
                  type="button"
                  onClick={() => void loadPins(cityId)}
                  className="inline-flex h-11 min-w-[120px] items-center justify-center rounded-full bg-[#2563EB] px-4 text-sm font-bold text-white"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {SERVED.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectCity(c.id)}
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-full border px-3.5 text-sm font-bold transition active:scale-[0.98]",
                c.id === cityId
                  ? "border-[#2563EB] bg-[#2563EB] text-white"
                  : "border-line bg-offwhite text-ink hover:border-[#2563EB]/40",
              )}
            >
              {c.shortLabel}
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href={`/teaser/${city.id}`}
            className="inline-flex h-12 items-center justify-center rounded-full border border-line bg-white px-5 text-sm font-bold text-ink shadow-sm"
          >
            Open {city.shortLabel} preview
          </Link>
          <Link
            href={`/signup?city=${encodeURIComponent(city.id)}`}
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#2563EB] px-5 text-sm font-bold text-white"
          >
            Unlock full scores
          </Link>
        </div>
      </div>
    </section>
  );
}
