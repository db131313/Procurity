"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  LngLatBounds,
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { formatMoneyRange } from "@/lib/format";
import type { ProjectPhase } from "@/lib/db/types";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
  "https://tiles.openfreemap.org/styles/liberty";

export type MapProject = {
  id: string;
  latitude: number;
  longitude: number;
  score: number;
  address: string;
  estValueLow: number;
  estValueHigh: number;
  buyingWindowEstimate: string;
  phase: ProjectPhase;
  borough?: string | null;
  updatedAt?: string;
  zip?: string | null;
};

/**
 * Buy Score pin colors
 * 90–100  green   #16A34A  excellent / act now
 * 80–89   teal    #0D9488  strong fit
 * 70–79   blue    #2563EB  worth pursuing
 * 60–69   amber   #D97706  monitor / warm
 * <60     slate   #64748B  lower priority
 */
export function pinColorForScore(score: number): string {
  if (score >= 90) return "#16A34A";
  if (score >= 80) return "#0D9488";
  if (score >= 70) return "#2563EB";
  if (score >= 60) return "#D97706";
  return "#64748B";
}

function scoreBand(score: number) {
  if (score >= 90) return "Hot · 90+";
  if (score >= 80) return "Strong · 80–89";
  if (score >= 70) return "Solid · 70–79";
  if (score >= 60) return "Warm · 60–69";
  return "Watch · <60";
}

type Props = {
  projects: MapProject[];
};

export function MapView({ projects }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const byId = useMemo(() => {
    const m = new Map<string, MapProject>();
    for (const p of projects) m.set(p.id, p);
    return m;
  }, [projects]);

  const selected = selectedId ? byId.get(selectedId) ?? null : null;

  const geojson = useMemo(
    () =>
      ({
        type: "FeatureCollection" as const,
        features: projects.map((p) => ({
          type: "Feature" as const,
          id: p.id,
          properties: {
            id: p.id,
            score: p.score,
            address: p.address,
            color: pinColorForScore(p.score),
            borough: p.borough ?? "",
          },
          geometry: {
            type: "Point" as const,
            coordinates: [p.longitude, p.latitude],
          },
        })),
      }) satisfies GeoJSON.FeatureCollection,
    [projects],
  );

  // Init map once — fill the parent which must have an explicit height
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;
    let map: MapLibreMap | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const init = () => {
      if (cancelled || !containerRef.current) return;
      // Ensure container has layout size before MapLibre measures it
      const { width, height } = containerRef.current.getBoundingClientRect();
      if (width < 2 || height < 2) {
        requestAnimationFrame(init);
        return;
      }

      map = new MapLibreMap({
        container: containerRef.current,
        style: STYLE_URL,
        center: [-73.94, 40.72],
        zoom: 10.2,
        pitch: 0,
        bearing: 0,
        maxPitch: 60,
      });
      map.addControl(new NavigationControl({ visualizePitch: true }), "top-right");
      mapRef.current = map;

      map.on("load", () => {
        if (cancelled || !map) return;
        map.resize();
        setMapReady(true);
      });

      resizeObserver = new ResizeObserver(() => {
        map?.resize();
      });
      resizeObserver.observe(containerRef.current);
    };

    const raf = requestAnimationFrame(init);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      setMapReady(false);
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  // Push GeoJSON + layers whenever projects change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const sourceId = "projects";
    const existing = map.getSource(sourceId) as GeoJSONSource | undefined;
    if (existing) {
      existing.setData(geojson);
    } else {
      map.addSource(sourceId, { type: "geojson", data: geojson });

      map.addLayer({
        id: "project-pins-halo",
        type: "circle",
        source: sourceId,
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            9,
            6,
            14,
            14,
          ],
          "circle-color": ["get", "color"],
          "circle-opacity": 0.22,
        },
      });

      map.addLayer({
        id: "project-pins",
        type: "circle",
        source: sourceId,
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            9,
            5,
            12,
            8,
            15,
            12,
          ],
          "circle-color": ["get", "color"],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.addLayer({
        id: "project-scores",
        type: "symbol",
        source: sourceId,
        minzoom: 12,
        layout: {
          "text-field": ["to-string", ["get", "score"]],
          "text-size": 10,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "rgba(0,0,0,0.25)",
          "text-halo-width": 0.5,
        },
      });

      const onEnter = () => {
        map.getCanvas().style.cursor = "pointer";
      };
      const onLeave = () => {
        map.getCanvas().style.cursor = "";
      };
      const onClick = (e: MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        const id = feature?.properties?.id as string | undefined;
        if (id) setSelectedId(id);
      };

      map.on("mouseenter", "project-pins", onEnter);
      map.on("mouseleave", "project-pins", onLeave);
      map.on("click", "project-pins", onClick);
      map.on("click", "project-scores", onClick);
    }

    if (geojson.features.length) {
      const bounds = new LngLatBounds();
      for (const f of geojson.features) {
        const c = f.geometry.coordinates as [number, number];
        bounds.extend(c);
      }
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, {
          padding: { top: 72, bottom: 48, left: 48, right: 48 },
          maxZoom: 12.2,
          duration: 600,
        });
      }
    }

    map.resize();
  }, [geojson, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selected) return;
    map.flyTo({
      center: [selected.longitude, selected.latitude],
      zoom: Math.max(map.getZoom(), 14),
      duration: 700,
      essential: true,
    });
  }, [selected]);

  return (
    <div className="relative h-full min-h-0 w-full flex-1">
      <div
        ref={containerRef}
        className="absolute inset-0 h-full w-full bg-[#dfe7ef]"
        aria-label="NYC construction opportunities map"
        role="application"
      />

      {/* Score legend */}
      <div className="pointer-events-none absolute bottom-4 left-3 z-10 md:bottom-6 md:left-5">
        <div className="pointer-events-auto rounded-2xl border border-line bg-white/95 px-3 py-2.5 text-[11px] shadow-md backdrop-blur">
          <p className="mb-1.5 font-bold text-ink">Buy Score</p>
          <ul className="space-y-1 font-semibold text-slate">
            {[
              { c: "#16A34A", t: "90+ Act now" },
              { c: "#0D9488", t: "80–89 Strong" },
              { c: "#2563EB", t: "70–79 Solid" },
              { c: "#D97706", t: "60–69 Warm" },
              { c: "#64748B", t: "<60 Watch" },
            ].map((row) => (
              <li key={row.t} className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white"
                  style={{ background: row.c }}
                />
                {row.t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <BottomSheet open={Boolean(selected)} onClose={() => setSelectedId(null)}>
        {selected && (
          <div className="pb-2">
            <div className="flex items-start gap-3">
              <ScoreRing score={selected.score} size={64} stroke={5} />
              <div className="min-w-0 flex-1">
                <p
                  className="text-[11px] font-bold uppercase tracking-wide"
                  style={{ color: pinColorForScore(selected.score) }}
                >
                  {scoreBand(selected.score)}
                </p>
                <p className="mt-0.5 text-lg font-bold text-ink">{selected.address}</p>
                <p className="mt-1 text-sm text-slate">
                  {[selected.borough, selected.zip].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-1 text-sm text-slate">
                  {formatMoneyRange(selected.estValueLow, selected.estValueHigh)} ·{" "}
                  {selected.buyingWindowEstimate}
                </p>
              </div>
            </div>
            <Link
              href={`/app/project/${encodeURIComponent(selected.id)}`}
              className="pc-gradient-bg mt-4 flex h-12 items-center justify-center rounded-full text-sm font-bold text-white"
            >
              View project
            </Link>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
