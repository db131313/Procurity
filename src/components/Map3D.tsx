"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import type { ScoredSite } from "@/lib/types";

type Props = {
  sites: ScoredSite[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

export function Map3D({ sites, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [tokenMissing, setTokenMissing] = useState(false);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || !containerRef.current) {
      setTokenMissing(true);
      return;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-73.98, 40.74],
      zoom: 11.2,
      pitch: 60,
      bearing: -17,
      antialias: true,
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");

    map.on("style.load", () => {
      const layers = map.getStyle()?.layers;
      const labelLayerId = layers?.find(
        (layer) => layer.type === "symbol" && layer.layout?.["text-field"],
      )?.id;

      if (!map.getLayer("add-3d-buildings")) {
        map.addLayer(
          {
            id: "add-3d-buildings",
            source: "composite",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            type: "fill-extrusion",
            minzoom: 14,
            paint: {
              "fill-extrusion-color": "#1a3a44",
              "fill-extrusion-height": [
                "interpolate",
                ["linear"],
                ["zoom"],
                14,
                0,
                14.05,
                ["get", "height"],
              ],
              "fill-extrusion-base": [
                "interpolate",
                ["linear"],
                ["zoom"],
                14,
                0,
                14.05,
                ["get", "min_height"],
              ],
              "fill-extrusion-opacity": 0.85,
            },
          },
          labelLayerId,
        );
      }
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    sites.forEach((site) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "site-marker";
      el.style.cssText = `
        width: 28px; height: 28px; border-radius: 999px;
        border: 2px solid ${site.id === selectedId ? "#f2ebe0" : "#2ec4b6"};
        background: ${site.probabilityScore >= 80 ? "#d4a017" : "#1f9e8f"};
        color: #0b1a22; font: 700 11px/1 Syne, sans-serif;
        box-shadow: 0 0 0 4px rgba(46,196,182,0.18);
        cursor: pointer;
      `;
      el.textContent = String(site.rank);
      el.addEventListener("click", () => onSelect?.(site.id));

      const popup = new mapboxgl.Popup({ offset: 18, closeButton: false }).setHTML(
        `<strong>#${site.rank} · ${site.probabilityScore}%</strong><br/>${site.address}<br/><span style="opacity:.75">${site.borough} · ${site.windowLabel}</span>`,
      );

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([site.longitude, site.latitude])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });

    if (sites.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      sites.forEach((s) => bounds.extend([s.longitude, s.latitude]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, pitch: 55, duration: 900 });
    }
  }, [sites, selectedId, onSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const site = sites.find((s) => s.id === selectedId);
    if (!site) return;
    map.flyTo({
      center: [site.longitude, site.latitude],
      zoom: 15.4,
      pitch: 65,
      bearing: -20,
      essential: true,
      duration: 1200,
    });
  }, [selectedId, sites]);

  if (tokenMissing) {
    return (
      <div className="relative flex h-full min-h-[360px] items-end overflow-hidden rounded-xl border border-[var(--line)] bg-ink-soft">
        <div className="hero-skyline opacity-80" />
        <div className="relative z-10 w-full p-6">
          <p className="brand-mark text-xl font-semibold">3D field map</p>
          <p className="mt-2 max-w-md text-sm text-sand/70">
            Add <code className="text-teal-bright">NEXT_PUBLIC_MAPBOX_TOKEN</code> to
            unlock Mapbox 3D buildings and live site pins. Ranked sites still load from
            NYC DOB intel.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {sites.slice(0, 8).map((site) => (
              <button
                key={site.id}
                type="button"
                onClick={() => onSelect?.(site.id)}
                className="rounded-md border border-[var(--line)] bg-ink/50 px-2.5 py-1 text-xs hover:border-teal-bright/50"
              >
                #{site.rank} {site.borough}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[360px] overflow-hidden rounded-xl border border-[var(--line)]"
    />
  );
}
