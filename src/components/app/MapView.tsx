"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import {
  DEFAULT_MAP_FILTERS,
  MapFilters,
  getMapFilters,
  scoreModeLabel,
  setMapFilters,
  type MapFilterState,
  type ScoreMode,
} from "@/components/app/MapFilters";
import { ProjectDetailOverlay } from "@/components/app/ProjectDetailOverlay";
import {
  DEFAULT_MAP_CAMERA,
  clearMapCamera,
  getMapCamera,
  setMapCamera,
} from "@/lib/map/cameraStore";
import {
  boundsForCity,
} from "@/lib/map/city-bounds";
import { MAP_PIN_DEFAULT_LIMIT } from "@/lib/map/pin-limits";
import type { ProjectPhase, TradeScores } from "@/lib/db/types";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
  "https://tiles.openfreemap.org/styles/liberty";

export type MapProject = {
  id: string;
  latitude: number;
  longitude: number;
  score: number;
  scoreConfidence?: "high" | "medium" | "low";
  tradeScores?: TradeScores;
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

function tradeScoresFor(p: MapProject): TradeScores {
  if (p.tradeScores) return p.tradeScores;
  const s = p.score;
  return {
    signage: s,
    lighting: s,
    glass: s,
    security: s,
    flooring: s,
  };
}

/** Pin score for coloring/filtering — overall Buy Score or one trade. */
export function effectivePinScore(
  p: MapProject,
  scoreMode: ScoreMode,
): number {
  if (scoreMode === "general") return p.score;
  const scores = tradeScoresFor(p);
  return scores[scoreMode] ?? p.score;
}

function matchesQuick(
  p: MapProject,
  score: number,
  quick: MapFilterState["quick"],
): boolean {
  if (quick === "all") return true;
  if (quick === "hot") return score >= 85;
  if (quick === "buying") {
    return (
      p.phase === "interior_finishing" ||
      p.phase === "sign_ready" ||
      score >= 80
    );
  }
  if (quick === "new") {
    if (!p.updatedAt) return false;
    return new Date(p.updatedAt).getTime() >= Date.now() - 7 * 86400000;
  }
  return true;
}

function matchesScorePreset(
  score: number,
  preset: MapFilterState["scorePreset"],
): boolean {
  if (preset === "all") return true;
  if (preset === "90+") return score >= 90;
  if (preset === "70-89") return score >= 70 && score <= 89;
  if (preset === "50-69") return score >= 50 && score <= 69;
  return true;
}

function captureCamera(map: MapLibreMap) {
  const c = map.getCenter();
  setMapCamera({
    center: [c.lng, c.lat],
    zoom: map.getZoom(),
    pitch: map.getPitch(),
    bearing: map.getBearing(),
  });
}

type Props = {
  projects: MapProject[];
  /** Optional city scope for viewport refetch */
  city?: string;
};

export function MapView({ projects: initialProjects, city }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [filters, setFilters] = useState<MapFilterState>(DEFAULT_MAP_FILTERS);
  const [projects, setProjects] = useState<MapProject[]>(initialProjects);
  const [pinsLoading, setPinsLoading] = useState(initialProjects.length === 0);
  const [pinCount, setPinCount] = useState<number | null>(
    initialProjects.length ? initialProjects.length : null,
  );
  const [pinsTruncated, setPinsTruncated] = useState(false);
  const fetchGen = useRef(0);
  const cityRef = useRef(city);
  cityRef.current = city;

  // Deep-link / QA: ?pin=<id> opens the detail overlay without flying the camera.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const pin = params.get("pin");
    if (pin) setSelectedId(pin);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const select = (id: string | null) => setSelectedId(id || null);
    (window as unknown as { __pcSelectProject?: (id: string | null) => void }).__pcSelectProject =
      select;
    return () => {
      delete (window as unknown as { __pcSelectProject?: (id: string | null) => void })
        .__pcSelectProject;
    };
  }, []);

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  // Restore filter state for this browser session
  useEffect(() => {
    setFilters(getMapFilters());
  }, []);

  function updateFilters(next: MapFilterState) {
    setFilters(next);
    setMapFilters(next);
  }

  const byId = useMemo(() => {
    const m = new Map<string, MapProject>();
    for (const p of projects) m.set(p.id, p);
    return m;
  }, [projects]);

  const selected = selectedId ? byId.get(selectedId) ?? null : null;
  const selectedScore = selected
    ? effectivePinScore(selected, filters.scoreMode)
    : 0;

  const visible = useMemo(() => {
    return projects
      .map((p) => {
        const score = effectivePinScore(p, filters.scoreMode);
        return { p, score };
      })
      .filter(
        ({ p, score }) =>
          matchesQuick(p, score, filters.quick) &&
          matchesScorePreset(score, filters.scorePreset),
      );
  }, [projects, filters]);

  const geojson = useMemo(
    () =>
      ({
        type: "FeatureCollection" as const,
        features: visible.map(({ p, score }) => ({
          type: "Feature" as const,
          id: p.id,
          properties: {
            id: p.id,
            score,
            address: p.address,
            color: pinColorForScore(score),
            borough: p.borough ?? "",
          },
          geometry: {
            type: "Point" as const,
            coordinates: [p.longitude, p.latitude],
          },
        })),
      }) satisfies GeoJSON.FeatureCollection,
    [visible],
  );

  /** Shared pin fetch — used for instant first paint + pan/zoom. */
  const fetchPins = (bounds: {
    west: number;
    south: number;
    east: number;
    north: number;
  }) => {
    const gen = ++fetchGen.current;
    const qs = new URLSearchParams({
      west: String(bounds.west),
      south: String(bounds.south),
      east: String(bounds.east),
      north: String(bounds.north),
      limit: String(MAP_PIN_DEFAULT_LIMIT),
    });
    if (city) qs.set("city", city);

    return fetch(`/api/map/pins?${qs.toString()}`, {
      credentials: "same-origin",
    })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as {
          pins?: MapProject[];
          totalMatched?: number;
          truncated?: boolean;
        };
        if (gen !== fetchGen.current) return;
        if (Array.isArray(data.pins)) {
          setProjects(data.pins);
          setPinCount(
            typeof data.totalMatched === "number"
              ? data.totalMatched
              : data.pins.length,
          );
          setPinsTruncated(Boolean(data.truncated));
        }
      })
      .catch(() => {
        // Keep current pins on network failure
      })
      .finally(() => {
        if (gen === fetchGen.current) setPinsLoading(false);
      });
  };

  // Instant first fetch — always use full city bounds on metro change so the
  // badge/pins aren't stuck on a leftover Brooklyn-cropped session camera.
  useEffect(() => {
    const cityBounds = boundsForCity(city);
    setPinsLoading(true);
    void fetchPins({
      west: cityBounds.west,
      south: cityBounds.south,
      east: cityBounds.east,
      north: cityBounds.north,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- first load / city change only
  }, [city]);

  // When the metro changes, drop the saved camera so we re-fit city bounds.
  const prevCityRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (
      prevCityRef.current !== undefined &&
      prevCityRef.current !== city
    ) {
      clearMapCamera();
    }
    prevCityRef.current = city;
  }, [city]);

  // Viewport refetch on pan/zoom once the map is ready.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let skipNextMoveEnd = true;

    const loadViewport = () => {
      const mapBounds = map.getBounds();
      const ne = mapBounds.getNorthEast();
      const sw = mapBounds.getSouthWest();
      const latPad = (ne.lat - sw.lat) * 0.15;
      const lngPad = (ne.lng - sw.lng) * 0.15;
      void fetchPins({
        west: sw.lng - lngPad,
        south: sw.lat - latPad,
        east: ne.lng + lngPad,
        north: ne.lat + latPad,
      });
    };

    const onMoveEnd = () => {
      // Skip the synthetic moveend from initial fitBounds so we don't
      // immediately replace the full-city pin set with a tighter crop.
      if (skipNextMoveEnd) {
        skipNextMoveEnd = false;
        return;
      }
      if (timer) clearTimeout(timer);
      timer = setTimeout(loadViewport, 280);
    };

    map.on("moveend", onMoveEnd);

    return () => {
      map.off("moveend", onMoveEnd);
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, city]);

  // Init map — fit city bounds on first visit; restore session camera after pan.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;
    let map: MapLibreMap | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const init = () => {
      if (cancelled || !containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      if (width < 2 || height < 2) {
        requestAnimationFrame(init);
        return;
      }

      const saved = getMapCamera();
      const cityBounds = boundsForCity(cityRef.current);

      map = new MapLibreMap({
        container: containerRef.current,
        style: STYLE_URL,
        center: saved?.center ?? DEFAULT_MAP_CAMERA.center,
        zoom: saved?.zoom ?? DEFAULT_MAP_CAMERA.zoom,
        pitch: saved?.pitch ?? DEFAULT_MAP_CAMERA.pitch,
        bearing: saved?.bearing ?? DEFAULT_MAP_CAMERA.bearing,
        maxPitch: 60,
      });
      // Bottom-right so it doesn't cover the Filters control (top-right).
      map.addControl(
        new NavigationControl({ visualizePitch: true }),
        "bottom-right",
      );
      mapRef.current = map;

      map.on("load", () => {
        if (cancelled || !map) return;
        map.dragPan.enable({ deceleration: 2500, linearity: 0.3 });
        if (!saved) {
          map.fitBounds(
            [
              [cityBounds.west, cityBounds.south],
              [cityBounds.east, cityBounds.north],
            ],
            {
              padding: { top: 56, bottom: 72, left: 28, right: 28 },
              pitch: DEFAULT_MAP_CAMERA.pitch,
              bearing: DEFAULT_MAP_CAMERA.bearing,
              duration: 0,
              essential: true,
            },
          );
        }
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

  // Push GeoJSON + fixed-size pin layers (no clustering)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const sourceId = "projects";
    const existing = map.getSource(sourceId) as GeoJSONSource | undefined;
    if (existing) {
      existing.setData(geojson);
    } else {
      map.addSource(sourceId, {
        type: "geojson",
        data: geojson,
      });

      map.addLayer({
        id: "project-pins-halo",
        type: "circle",
        source: sourceId,
        paint: {
          "circle-radius": 12,
          "circle-color": ["get", "color"],
          "circle-opacity": 0.22,
        },
      });

      map.addLayer({
        id: "project-pins",
        type: "circle",
        source: sourceId,
        paint: {
          "circle-radius": 8,
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
      const onClickPin = (e: MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        const id = feature?.properties?.id as string | undefined;
        if (id) {
          captureCamera(map);
          setSelectedId(id);
        }
      };

      map.on("mouseenter", "project-pins", onEnter);
      map.on("mouseleave", "project-pins", onLeave);
      map.on("click", "project-pins", onClickPin);
      map.on("click", "project-scores", onClickPin);
    }

    map.resize();
  }, [geojson, mapReady]);

  // Intentionally no flyTo on pin select — preserve pan/zoom so closing the
  // overlay returns the rep to the exact same map camera.

  return (
    <div className="relative h-full min-h-0 w-full flex-1">
      <div
        ref={containerRef}
        className="absolute inset-0 h-full w-full bg-[#dfe7ef]"
        aria-label="Construction opportunities map"
        role="application"
      />

      {city && (
        <div className="pointer-events-none absolute left-3 top-3 z-30 md:left-5 md:top-4">
          <p className="rounded-full border border-line bg-white/95 px-3 py-1.5 text-[11px] font-bold text-ink shadow-sm backdrop-blur">
            {city.replace(/_/g, " ")}
            {pinCount != null
              ? ` · ${pinCount.toLocaleString()} in view`
              : ""}
            {pinsTruncated ? " · top scores" : ""}
          </p>
        </div>
      )}

      {pinsLoading && projects.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div className="rounded-2xl border border-line bg-white/95 px-4 py-3 text-sm font-semibold text-slate shadow-md backdrop-blur">
            Loading pins…
          </div>
        </div>
      )}

      <MapFilters value={filters} onChange={updateFilters} />

      <div className="pointer-events-none absolute bottom-3 left-3 z-30 md:bottom-6 md:left-5">
        <div className="pointer-events-auto rounded-2xl border border-line bg-white/95 px-3 py-2.5 text-[11px] shadow-md backdrop-blur">
          <p className="mb-1.5 font-bold text-ink">
            {filters.scoreMode === "general"
              ? "Buy Score"
              : `${scoreModeLabel(filters.scoreMode)} Score`}
          </p>
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

      <ProjectDetailOverlay
        project={selected}
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        displayScore={selectedScore}
      />
    </div>
  );
}
