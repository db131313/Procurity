"use client";

import { useEffect, useRef } from "react";
import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
} from "maplibre-gl";
import type { ScoredSite } from "@/lib/types";

const FREE_STYLE = "https://tiles.openfreemap.org/styles/dark";

type Props = {
  sites: ScoredSite[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

export function Map3D({ sites, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: FREE_STYLE,
      center: [-73.98, 40.74],
      zoom: 11.2,
      pitch: 60,
      bearing: -17,
      antialias: true,
    });

    map.addControl(
      new NavigationControl({ visualizePitch: true }),
      "top-right",
    );

    map.on("load", () => {
      const layers = map.getStyle().layers;
      const labelLayerId = layers?.find(
        (layer) => layer.type === "symbol" && layer.layout?.["text-field"],
      )?.id;

      if (!map.getLayer("procurity-3d-buildings")) {
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
                "interpolate",
                ["linear"],
                ["zoom"],
                13,
                0,
                13.5,
                ["coalesce", ["get", "render_height"], ["get", "height"], 12],
              ],
              "fill-extrusion-base": [
                "coalesce",
                ["get", "render_min_height"],
                ["get", "min_height"],
                0,
              ],
              "fill-extrusion-opacity": 0.88,
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

    const paintMarkers = () => {
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

        const popup = new Popup({
          offset: 18,
          closeButton: false,
        }).setHTML(
          `<strong>#${site.rank} · ${site.probabilityScore}%</strong><br/>${site.address}<br/><span style="opacity:.75">${site.borough} · ${site.windowLabel}</span>`,
        );

        const marker = new Marker({ element: el })
          .setLngLat([site.longitude, site.latitude])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });

      if (sites.length > 0) {
        const bounds = new LngLatBounds();
        sites.forEach((s) => bounds.extend([s.longitude, s.latitude]));
        map.fitBounds(bounds, {
          padding: 60,
          maxZoom: 14,
          pitch: 55,
          duration: 900,
        });
      }
    };

    if (map.isStyleLoaded()) paintMarkers();
    else map.once("load", paintMarkers);
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

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[360px] overflow-hidden rounded-xl border border-[var(--line)]"
    />
  );
}
