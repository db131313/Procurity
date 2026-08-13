"use client";

import { useEffect, useRef } from "react";
import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  setWorkerUrl,
} from "maplibre-gl";
import type { ScoredSite } from "@/lib/types";

/** Free OpenFreeMap style — no API key, no credit card. */
const FREE_STYLE = "https://tiles.openfreemap.org/styles/liberty";

// MapLibre v6 needs an explicit worker URL under Next/Turbopack bundling,
// otherwise the map canvas mounts but never fetches vector tiles.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

type Props = {
  sites: ScoredSite[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

export function Map3D({ sites, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    let map: MapLibreMap | null = null;

    const boot = () => {
      if (cancelled || !containerRef.current) return;

      map = new MapLibreMap({
        container: containerRef.current,
        style: FREE_STYLE,
        center: [-73.98, 40.74],
        zoom: 11.4,
        pitch: 58,
        bearing: -18,
        maxPitch: 70,
      });

      map.addControl(
        new NavigationControl({ visualizePitch: true }),
        "top-right",
      );

      map.on("load", () => {
        if (!map) return;
        map.resize();

        // Liberty already includes building-3d; boost color to match brand.
        if (map.getLayer("building-3d")) {
          map.setPaintProperty("building-3d", "fill-extrusion-color", "#1a3a44");
          map.setPaintProperty("building-3d", "fill-extrusion-opacity", 0.9);
        } else if (!map.getLayer("procurity-3d-buildings")) {
          const layers = map.getStyle().layers ?? [];
          const labelLayerId = layers.find(
            (layer) => layer.type === "symbol" && layer.layout?.["text-field"],
          )?.id;

          map.addLayer(
            {
              id: "procurity-3d-buildings",
              source: "openmaptiles",
              "source-layer": "building",
              type: "fill-extrusion",
              minzoom: 13,
              paint: {
                "fill-extrusion-color": "#1a3a44",
                "fill-extrusion-height": [
                  "coalesce",
                  ["get", "render_height"],
                  ["get", "height"],
                  16,
                ],
                "fill-extrusion-base": [
                  "coalesce",
                  ["get", "render_min_height"],
                  ["get", "min_height"],
                  0,
                ],
                "fill-extrusion-opacity": 0.9,
              },
            },
            labelLayerId,
          );
        }
      });

      mapRef.current = map;
    };

    // Wait a frame so the flex layout has a real height before GL init.
    const raf = requestAnimationFrame(boot);

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

    const paintMarkers = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      sites.forEach((site) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "site-marker";
        button.setAttribute("aria-label", `Site ${site.rank} ${site.address}`);
        button.style.cssText = `
          width: 30px; height: 30px; border-radius: 999px;
          border: 2px solid ${site.id === selectedId ? "#f2ebe0" : "#0b1a22"};
          background: ${site.probabilityScore >= 80 ? "#d4a017" : "#1f9e8f"};
          color: #ffffff; font: 800 12px/1 Syne, sans-serif;
          box-shadow: 0 0 0 3px rgba(11,26,34,0.28);
          cursor: pointer;
        `;
        button.textContent = String(site.rank);
        button.addEventListener("click", () => onSelectRef.current?.(site.id));

        const popup = new Popup({
          offset: 18,
          closeButton: false,
        }).setHTML(
          `<strong>#${site.rank} · ${site.probabilityScore}%</strong><br/>${site.address}<br/><span style="opacity:.75">${site.borough} · ${site.windowLabel}</span>`,
        );

        markersRef.current.push(
          new Marker({ element: button })
            .setLngLat([site.longitude, site.latitude])
            .setPopup(popup)
            .addTo(map),
        );
      });

      if (sites.length > 0) {
        const bounds = new LngLatBounds();
        sites.forEach((s) => bounds.extend([s.longitude, s.latitude]));
        map.fitBounds(bounds, {
          padding: 70,
          maxZoom: 14,
          pitch: 55,
          duration: 900,
        });
      }

      map.resize();
    };

    if (map.loaded()) paintMarkers();
    else map.once("load", paintMarkers);
  }, [sites, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const site = sites.find((s) => s.id === selectedId);
    if (!site) return;
    map.flyTo({
      center: [site.longitude, site.latitude],
      zoom: 15.6,
      pitch: 62,
      bearing: -22,
      essential: true,
      duration: 1200,
    });
  }, [selectedId, sites]);

  return (
    <div className="relative h-full min-h-[420px] overflow-hidden rounded-xl border border-[var(--line)] bg-[#d8e0e5]">
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
