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
  /** Permit type only — no score / value / contacts */
  permitType: string;
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
 * Public teaser map: limited pins, permit type only, then lock overlay + CTA.
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
          features: pins.map((p) => ({
            type: "Feature" as const,
            properties: {
              id: p.id,
              permitType: p.permitType,
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
            "circle-color": "#0D9488",
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
            "text-field": ["get", "permitType"],
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
    <div className="relative h-[min(70dvh,560px)] w-full overflow-hidden rounded-3xl border border-line bg-[#dfe7ef] shadow-lg md:h-[640px]">
      <div
        ref={containerRef}
        className="absolute inset-0"
        role="application"
        aria-label={`${cityLabel} teaser map`}
      />

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate">
          Loading {cityLabel} permits…
        </div>
      )}

      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-2xl border border-line bg-white/95 px-3 py-2 text-[11px] font-semibold text-slate shadow-sm backdrop-blur">
        Preview · {pins.length} pins · permit type only
      </div>

      {locked && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-end bg-gradient-to-t from-ink/80 via-ink/45 to-ink/20 p-5 pb-8 backdrop-blur-[2px] sm:justify-center sm:pb-5">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/95 p-5 text-center shadow-2xl backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-wide text-purple">
              Unlock full map
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-ink sm:text-2xl">
              Sign up to see all {totalCount.toLocaleString()} active projects in{" "}
              {cityLabel}
            </h2>
            <p className="mt-2 text-sm text-slate">
              Buy Scores, contact intel, and project value unlock after signup and
              checkout — this preview only shows rough locations and permit type.
            </p>
            <Link
              href={signupHref}
              className="pc-gradient-bg mt-5 flex h-12 items-center justify-center rounded-full text-sm font-bold text-white"
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
