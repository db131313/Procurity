"use client";

import { useEffect, useRef } from "react";
import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  setWorkerUrl,
} from "maplibre-gl";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const FREE_STYLE = "https://tiles.openfreemap.org/styles/liberty";

type Pin = {
  id: string;
  score: number;
  lng: number;
  lat: number;
  hot?: boolean;
};

type Props = {
  pins: Pin[];
  className?: string;
};

export function WelcomeMapHero({ pins, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let map: MapLibreMap | null = null;
    let orbitTimer: number | undefined;

    const raf = requestAnimationFrame(() => {
      if (cancelled || !containerRef.current) return;

      map = new MapLibreMap({
        container: containerRef.current,
        style: FREE_STYLE,
        center: [-73.985, 40.748],
        zoom: 12.4,
        pitch: 62,
        bearing: -28,
        interactive: true,
        attributionControl: false,
        maxPitch: 70,
      });

      map.on("load", () => {
        if (!map) return;
        map.resize();

        if (map.getLayer("building-3d")) {
          map.setPaintProperty("building-3d", "fill-extrusion-color", [
            "interpolate",
            ["linear"],
            ["coalesce", ["get", "render_height"], 20],
            10,
            "#d4d8e2",
            80,
            "#9aa3b5",
            200,
            "#6b728a",
          ]);
          map.setPaintProperty("building-3d", "fill-extrusion-opacity", 0.95);
        }

        // Soft neon fog / atmosphere via sky-ish hillshade tone
        if (!map.getLayer("pc-glow-buildings") && map.getSource("openmaptiles")) {
          try {
            map.addLayer({
              id: "pc-glow-buildings",
              source: "openmaptiles",
              "source-layer": "building",
              type: "fill-extrusion",
              minzoom: 13,
              filter: [">", ["coalesce", ["get", "render_height"], 0], 40],
              paint: {
                "fill-extrusion-color": "#8b5cf6",
                "fill-extrusion-height": [
                  "coalesce",
                  ["get", "render_height"],
                  60,
                ],
                "fill-extrusion-base": [
                  "coalesce",
                  ["get", "render_min_height"],
                  0,
                ],
                "fill-extrusion-opacity": 0.22,
              },
            });
          } catch {
            // style may already include extrusion
          }
        }

        paintPins(map, pins);

        // Gentle orbit for presence
        let bearing = -28;
        orbitTimer = window.setInterval(() => {
          if (!map || map.isMoving()) return;
          bearing += 0.35;
          map.easeTo({ bearing, duration: 1100, easing: (t) => t });
        }, 1200);
      });

      mapRef.current = map;
    });

    const onResize = () => mapRef.current?.resize();
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (orbitTimer) window.clearInterval(orbitTimer);
      window.removeEventListener("resize", onResize);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map?.remove();
      mapRef.current = null;
    };
  }, [pins]);

  function paintPins(map: MapLibreMap, nextPins: Pin[]) {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    nextPins.forEach((pin, i) => {
      const el = document.createElement("div");
      el.className = "pc-welcome-pin";
      el.style.cssText = `
        width: ${pin.hot ? 44 : 34}px;
        height: ${pin.hot ? 54 : 34}px;
        animation: pc-pin-bob 2.4s ease-in-out ${i * 0.15}s infinite;
        filter: drop-shadow(0 8px 14px rgba(124,58,237,.28));
        cursor: default;
      `;
      el.innerHTML = pin.hot
        ? `<svg viewBox="0 0 46 56" width="44" height="54">
            <defs>
              <linearGradient id="wg${i}" x1="0" y1="0" x2="1" y2="1">
                <stop stop-color="#8B5CF6"/><stop offset="1" stop-color="#2DD4BF"/>
              </linearGradient>
            </defs>
            <path d="M23 2c11 0 20 8.7 20 20.2C43 36 23 54 23 54S3 36 3 22.2C3 10.7 12 2 23 2Z" fill="url(#wg${i})"/>
            <circle cx="23" cy="22" r="12" fill="white"/>
            <text x="23" y="26" text-anchor="middle" font-size="11" font-weight="800" fill="#7C3AED" font-family="Satoshi,sans-serif">${pin.score}</text>
          </svg>`
        : `<svg viewBox="0 0 34 34" width="34" height="34">
            <circle cx="17" cy="17" r="15" fill="white" stroke="#E2E8F0" stroke-width="2"/>
            <circle cx="17" cy="17" r="11" fill="#111827"/>
            <text x="17" y="20.5" text-anchor="middle" font-size="10" font-weight="700" fill="white" font-family="Satoshi,sans-serif">${pin.score}</text>
          </svg>`;

      markersRef.current.push(
        new Marker({ element: el, anchor: pin.hot ? "bottom" : "center" })
          .setLngLat([pin.lng, pin.lat])
          .addTo(map),
      );
    });

    if (nextPins.length) {
      const bounds = new LngLatBounds();
      nextPins.forEach((p) => bounds.extend([p.lng, p.lat]));
      map.fitBounds(bounds, {
        padding: 48,
        maxZoom: 13.8,
        pitch: 60,
        duration: 900,
      });
    }
  }

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border border-white/60 shadow-[0_20px_50px_rgba(91,33,182,0.18)] ${className}`}
    >
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-80" />
      <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold tracking-wide text-pc-purple shadow-sm">
        LIVE 3D INTEL
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-2xl bg-white/92 px-3 py-2 text-[11px] font-semibold text-pc-ink shadow-sm backdrop-blur">
        <span>NYC buy-window sites</span>
        <span className="pc-gradient-text">{pins.length} hot pins</span>
      </div>
    </div>
  );
}
