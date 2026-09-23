"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
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
};

type Props = {
  /** Initial city id from the server (usually nyc). */
  initialCityId?: string;
};

const SERVED = PICKER_CITIES.filter((c) => c.served);

/**
 * Home-page teaser map: city chips below fly the camera with MapLibre flyTo.
 * Pins load from the public teaser API (capped, no scores/contacts).
 */
export function HomeTeaserMapSection({ initialCityId = "nyc" }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [cityId, setCityId] = useState(initialCityId);
  const [pins, setPins] = useState<TeaserPin[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const city: PickerCity =
    SERVED.find((c) => c.id === cityId) ?? SERVED[0]!;

  const loadPins = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/teaser/pins?city=${encodeURIComponent(id)}`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        pins?: TeaserPin[];
        totalCount?: number;
      };
      setPins(Array.isArray(data.pins) ? data.pins : []);
      setTotalCount(
        typeof data.totalCount === "number" ? data.totalCount : 0,
      );
    } catch {
      // keep prior pins
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPins(cityId);
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
            "circle-color": "#0D9488",
            "circle-opacity": 0.25,
          },
        });
        map.addLayer({
          id: "teaser-pins",
          type: "circle",
          source: "teaser-pins",
          paint: {
            "circle-radius": 6,
            "circle-color": "#0D9488",
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

  // Push pins into the map source
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource("teaser-pins") as GeoJSONSource | undefined;
    if (!source) return;
    source.setData({
      type: "FeatureCollection",
      features: pins.map((p) => ({
        type: "Feature",
        id: p.id,
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [p.longitude, p.latitude],
        },
      })),
    });
  }, [pins, ready]);

  // Smooth flyTo on city change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.flyTo({
      center: city.center,
      zoom: city.zoom,
      duration: 900,
      essential: true,
    });
  }, [city, ready]);

  return (
    <section className="bg-white px-5 py-16 md:px-10 md:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-bold tracking-tight text-ink md:text-4xl">
          Peek at live permit activity
        </h2>
        <p className="mt-3 max-w-xl text-slate">
          Explore a live preview of scored construction activity. Pick a city —
          the map flies there instantly.
        </p>

        <div className="relative mt-8 overflow-hidden rounded-3xl border border-line bg-[#dfe7ef] shadow-sm">
          <div
            ref={containerRef}
            className="h-[min(62dvh,480px)] w-full md:h-[520px]"
            aria-label="Teaser map of construction permits"
            role="application"
          />
          {loading && (
            <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
              <WorkingPill className="py-1.5 text-[11px] shadow-sm">
                Loading pins…
              </WorkingPill>
            </div>
          )}
          {!loading && totalCount > 0 && (
            <div className="pointer-events-none absolute left-3 top-3">
              <span className="rounded-full border border-line bg-white/95 px-3 py-1.5 text-[11px] font-bold text-ink shadow-sm">
                {city.label} · {totalCount.toLocaleString()} projects
              </span>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {SERVED.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCityId(c.id)}
              className={cn(
                "rounded-full border px-3.5 py-2 text-sm font-bold transition active:scale-[0.98]",
                c.id === cityId
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-offwhite text-ink hover:border-ink/40",
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
            className="pc-gradient-bg inline-flex h-12 items-center justify-center rounded-full px-5 text-sm font-bold text-white"
          >
            Unlock full scores
          </Link>
        </div>
      </div>
    </section>
  );
}
