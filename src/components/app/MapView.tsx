"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
} from "maplibre-gl";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { cn } from "@/lib/cn";
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
  updatedAt?: string;
  zip?: string | null;
};

type FilterKey = "all" | "hot" | "buying" | "new";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "hot", label: "Hot" },
  { key: "buying", label: "Buying Now" },
  { key: "new", label: "New" },
];

function pinStyle(score: number) {
  if (score >= 90) {
    return {
      fill: "#F97316",
      text: "#ffffff",
      className: "pc-hot-glow",
      ring: "#FED7AA",
    };
  }
  if (score >= 80) {
    return {
      fill: "url(#pinGrad)",
      text: "#ffffff",
      className: "",
      ring: "#E0E7FF",
      gradient: true,
    };
  }
  if (score >= 60) {
    return {
      fill: "#4F9CF8",
      text: "#ffffff",
      className: "",
      ring: "#DBEAFE",
    };
  }
  return {
    fill: "#9CA3AF",
    text: "#ffffff",
    className: "",
    ring: "#E5E7EB",
  };
}

function matchesFilter(p: MapProject, filter: FilterKey) {
  if (filter === "all") return true;
  // Real DOB scores rarely hit 90+; treat 85+ as hot opportunity band
  if (filter === "hot") return p.score >= 85;
  if (filter === "buying") {
    return (
      p.phase === "interior_finishing" ||
      p.phase === "sign_ready" ||
      p.score >= 80
    );
  }
  if (filter === "new") {
    if (!p.updatedAt) return true;
    return new Date(p.updatedAt).getTime() >= Date.now() - 7 * 86400000;
  }
  return true;
}

type Props = {
  projects: MapProject[];
  zipCodes?: string[];
};

export function MapView({ projects, zipCodes = [] }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zipFilter, setZipFilter] = useState<string>("all");

  const visible = useMemo(() => {
    const filtered = projects.filter((p) => {
      if (zipFilter !== "all" && p.zip !== zipFilter) return false;
      return matchesFilter(p, filter);
    });
    // Cap DOM markers for mobile performance on large live feeds
    return [...filtered].sort((a, b) => b.score - a.score).slice(0, 350);
  }, [projects, filter, zipFilter]);

  const selected = visible.find((p) => p.id === selectedId) ?? null;

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let map: MapLibreMap | null = null;

    const raf = requestAnimationFrame(() => {
      if (cancelled || !containerRef.current) return;
      map = new MapLibreMap({
        container: containerRef.current,
        style: STYLE_URL,
        center: [-73.98, 40.74],
        zoom: 11.6,
        pitch: 45,
        bearing: -12,
        maxPitch: 70,
      });
      map.addControl(
        new NavigationControl({ visualizePitch: true }),
        "top-right",
      );
      map.on("load", () => map?.resize());
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

      visible.forEach((project) => {
        const style = pinStyle(project.score);
        const el = document.createElement("button");
        el.type = "button";
        el.setAttribute("aria-label", `Score ${project.score} at ${project.address}`);
        el.className = cn("border-0 bg-transparent cursor-pointer", style.className);
        el.style.cssText =
          "width:40px;height:40px;padding:0;filter:drop-shadow(0 6px 10px rgba(15,23,42,.22));";
        el.innerHTML = `
          <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
            <defs>
              <linearGradient id="pinGrad" x1="0" y1="0" x2="1" y2="1">
                <stop stop-color="#7C6CF6"/><stop offset="1" stop-color="#38D9C9"/>
              </linearGradient>
            </defs>
            <circle cx="20" cy="20" r="18" fill="${style.ring}"/>
            <circle cx="20" cy="20" r="14" fill="${style.fill}"/>
            <text x="20" y="24" text-anchor="middle" font-size="11" font-weight="800"
              fill="${style.text}" font-family="Satoshi,sans-serif">${project.score}</text>
          </svg>`;
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          setSelectedId(project.id);
        });
        markersRef.current.push(
          new Marker({ element: el, anchor: "center" })
            .setLngLat([project.longitude, project.latitude])
            .addTo(map),
        );
      });

      if (visible.length) {
        const bounds = new LngLatBounds();
        visible.forEach((p) => bounds.extend([p.longitude, p.latitude]));
        map.fitBounds(bounds, { padding: 64, maxZoom: 14, duration: 700 });
      }
      map.resize();
    };

    if (map.loaded()) paint();
    else map.once("load", paint);
  }, [visible]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selected) return;
    map.flyTo({
      center: [selected.longitude, selected.latitude],
      zoom: 15.2,
      pitch: 55,
      duration: 900,
      essential: true,
    });
  }, [selected]);

  return (
    <div className="relative h-[calc(100dvh-0px)] min-h-[100dvh] w-full md:min-h-0 md:flex-1">
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-3 pt-3 md:px-5 md:pt-5">
        <div className="pointer-events-auto flex flex-col gap-2">
          {zipCodes.length > 0 && (
            <label className="inline-flex w-fit items-center gap-2 rounded-full border border-line bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink shadow-sm backdrop-blur">
              <span className="text-slate">Zip</span>
              <select
                aria-label="Filter by zip code"
                className="bg-transparent font-bold outline-none"
                value={zipFilter}
                onChange={(e) => setZipFilter(e.target.value)}
              >
                <option value="all">All zips</option>
                {zipCodes.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            role="toolbar"
            aria-label="Map filters"
          >
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={filter === f.key}
                aria-label={`Show ${f.label} projects`}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-2 text-xs font-bold shadow-sm transition",
                  filter === f.key
                    ? "pc-gradient-bg text-white"
                    : "border border-line bg-white/95 text-ink backdrop-blur",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <BottomSheet open={Boolean(selected)} onClose={() => setSelectedId(null)}>
        {selected && (
          <div className="pb-2">
            <div className="flex items-start gap-3">
              <ScoreRing score={selected.score} size={64} stroke={5} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-purple">
                  {selected.score >= 90 ? "Hot opportunity" : "Opportunity"}
                </p>
                <p className="mt-0.5 text-lg font-bold text-ink">{selected.address}</p>
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
