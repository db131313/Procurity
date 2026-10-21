"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
} from "maplibre-gl";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
  "https://tiles.openfreemap.org/styles/liberty";

export type TeaserPin = {
  id: string;
  latitude: number;
  longitude: number;
  /** Friendly project label — no scores / contacts */
  label: string;
  addressRough: string;
};

type Props = {
  cityLabel: string;
  cityId: string;
  center: [number, number];
  zoom: number;
  pins: TeaserPin[];
  totalCount: number;
};

/**
 * Public teaser map: limited pins, project label only, then lock overlay + CTA.
 */
export function TeaserMapView({
  cityLabel,
  cityId,
  center,
  zoom,
  pins,
  totalCount,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setLocked(true), 15_000);
    return () => window.clearTimeout(t);
  }, []);

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
        center,
        zoom,
        maxPitch: 45,
      });
      map.addControl(new NavigationControl({ visualizePitch: false }), "top-right");
      mapRef.current = map;

      map.on("load", () => {
        if (cancelled || !map) return;
        const geojson = {
          type: "FeatureCollection" as const,
          features: pins.map((p, i) => ({
            type: "Feature" as const,
            id: i + 1,
            properties: {
              projectId: p.id,
              label: p.label,
            },
            geometry: {
              type: "Point" as const,
              coordinates: [p.longitude, p.latitude],
            },
          })),
        };
        map.addSource("teaser", { type: "geojson", data: geojson });
        map.addLayer({
          id: "teaser-pins",
          type: "circle",
          source: "teaser",
          paint: {
            "circle-radius": 7,
            "circle-color": "#2563EB",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });
        map.addLayer({
          id: "teaser-labels",
          type: "symbol",
          source: "teaser",
          minzoom: 12,
          layout: {
            "text-field": ["get", "label"],
            "text-size": 10,
            "text-offset": [0, 1.2],
            "text-anchor": "top",
          },
          paint: {
            "text-color": "#0f172a",
            "text-halo-color": "#ffffff",
            "text-halo-width": 1,
          },
        });
        setReady(true);
      });
    };

    requestAnimationFrame(init);
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, [center, zoom, pins]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (locked) {
      map.dragPan.disable();
      map.scrollZoom.disable();
      map.boxZoom.disable();
      map.dragRotate.disable();
      map.touchZoomRotate.disable();
    } else {
      map.dragPan.enable();
      map.scrollZoom.enable();
      map.boxZoom.enable();
      map.dragRotate.enable();
      map.touchZoomRotate.enable();
    }
  }, [locked]);

  const signupHref = `/signup?city=${encodeURIComponent(cityId)}&checkout=1&tier=growth`;

  return (
    <div className="relative h-[min(70dvh,560px)] w-full overflow-hidden rounded-3xl border border-line bg-[#dfe7ef] shadow-sm md:h-[640px]">
      <div
        ref={containerRef}
        className="absolute inset-0"
        role="application"
        aria-label={`${cityLabel} project preview map`}
      />

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate">
          Loading {cityLabel} projects…
        </div>
      )}

      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-2xl border border-line bg-white/95 px-3 py-2 text-[11px] font-semibold text-slate shadow-sm backdrop-blur">
        Preview · {pins.length} pins · project type only
      </div>

      {locked && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-end bg-ink/55 p-5 pb-8 sm:justify-center sm:pb-5">
          <div className="w-full max-w-md rounded-3xl border border-line bg-white p-5 text-center shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-[#2563EB]">
              Unlock full map
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-ink sm:text-2xl">
              Sign up to see all {totalCount.toLocaleString()} active projects in{" "}
              {cityLabel}
            </h2>
            <p className="mt-2 text-sm text-slate">
              Buy Scores, contacts, and project value unlock after signup —
              this preview only shows rough locations and project type.
            </p>
            <Link
              href={signupHref}
              className="mt-5 flex h-12 items-center justify-center rounded-full bg-[#2563EB] text-sm font-bold text-white"
            >
              Sign up to unlock
            </Link>
            <button
              type="button"
              className="mt-3 text-xs font-semibold text-slate underline-offset-2 hover:underline"
              onClick={() => setLocked(false)}
            >
              Keep exploring preview ({pins.length} pins)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
