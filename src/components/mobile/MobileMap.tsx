"use client";

import { useEffect, useRef } from "react";
import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
} from "maplibre-gl";
import type { OpportunityView } from "@/lib/opportunity";

const FREE_STYLE = "https://tiles.openfreemap.org/styles/liberty";
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

type Props = {
  sites: OpportunityView[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

export function MobileMap({ sites, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let map: MapLibreMap | null = null;

    const raf = requestAnimationFrame(() => {
      if (cancelled || !containerRef.current) return;
      map = new MapLibreMap({
        container: containerRef.current,
        style: FREE_STYLE,
        center: [-73.98, 40.74],
        zoom: 11.8,
        pitch: 55,
        bearing: -16,
        maxPitch: 70,
      });
      map.addControl(new NavigationControl({ visualizePitch: true }), "top-right");
      map.on("load", () => {
        map?.resize();
        if (map?.getLayer("building-3d")) {
          map.setPaintProperty("building-3d", "fill-extrusion-color", "#c4c9d4");
          map.setPaintProperty("building-3d", "fill-extrusion-opacity", 0.92);
        }
      });
      mapRef.current = map;
    });

    const onResize = () => mapRef.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const paint = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      sites.forEach((site) => {
        const selected = site.id === selectedId;
        const el = document.createElement("button");
        el.type = "button";
        el.className = "pc-map-pin";
        el.style.cssText = selected
          ? `
            width: 46px; height: 56px; border: 0; background: transparent; cursor: pointer;
            filter: drop-shadow(0 10px 16px rgba(124,58,237,.35));
          `
          : `
            width: 34px; height: 34px; border: 0; background: transparent; cursor: pointer;
            filter: drop-shadow(0 6px 10px rgba(15,23,42,.2));
          `;
        el.innerHTML = selected
          ? `<svg viewBox="0 0 46 56" width="46" height="56">
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                  <stop stop-color="#8B5CF6"/><stop offset="1" stop-color="#2DD4BF"/>
                </linearGradient>
              </defs>
              <path d="M23 2c11 0 20 8.7 20 20.2C43 36 23 54 23 54S3 36 3 22.2C3 10.7 12 2 23 2Z" fill="url(#g)"/>
              <circle cx="23" cy="22" r="12" fill="white"/>
              <text x="23" y="26" text-anchor="middle" font-size="11" font-weight="800" fill="#7C3AED" font-family="Satoshi,sans-serif">${site.probabilityScore}</text>
            </svg>`
          : `<svg viewBox="0 0 34 34" width="34" height="34">
              <circle cx="17" cy="17" r="15" fill="white" stroke="#E2E8F0" stroke-width="2"/>
              <circle cx="17" cy="17" r="11" fill="#111827"/>
              <text x="17" y="20.5" text-anchor="middle" font-size="10" font-weight="700" fill="white" font-family="Satoshi,sans-serif">${site.probabilityScore}</text>
            </svg>`;
        el.addEventListener("click", () => onSelectRef.current?.(site.id));
        markersRef.current.push(
          new Marker({ element: el, anchor: selected ? "bottom" : "center" })
            .setLngLat([site.longitude, site.latitude])
            .addTo(map),
        );
      });

      if (sites.length) {
        const bounds = new LngLatBounds();
        sites.forEach((s) => bounds.extend([s.longitude, s.latitude]));
        map.fitBounds(bounds, { padding: 70, maxZoom: 14, pitch: 52, duration: 800 });
      }
      map.resize();
    };

    if (map.loaded()) paint();
    else map.once("load", paint);
  }, [sites, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const site = sites.find((s) => s.id === selectedId);
    if (!site) return;
    map.flyTo({
      center: [site.longitude, site.latitude],
      zoom: 15.4,
      pitch: 60,
      bearing: -20,
      duration: 1100,
      essential: true,
    });
  }, [selectedId, sites]);

  return <div ref={containerRef} className="absolute inset-0 h-full w-full" />;
}
