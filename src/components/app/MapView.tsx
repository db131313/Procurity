"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Map as MapLibreMap,
  NavigationControl,
  LngLatBounds,
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
import { MapCityPicker } from "@/components/app/MapCityPicker";
import { MapRoutePanel } from "@/components/app/MapRoutePanel";
import { MapRouteStartFab } from "@/components/app/MapRouteStartFab";
import { PlanMyDayAgentBanner } from "@/components/app/PlanMyDayAgentBanner";
import { ProjectDetailOverlay } from "@/components/app/ProjectDetailOverlay";
import {
  DEFAULT_MAP_CAMERA,
  clearMapCamera,
  getMapCamera,
  setMapCamera,
} from "@/lib/map/cameraStore";
import {
  boundsForCity,
  citiesIntersectingBounds,
  type LonLatBounds,
} from "@/lib/map/city-bounds";
import { MAP_PIN_DEFAULT_LIMIT } from "@/lib/map/pin-limits";
import { CITY_COOKIE } from "@/lib/cities/picker";
import type { ProjectPhase, TradeScores } from "@/lib/db/types";
import {
  loadMapRoute,
  type RouteResult,
} from "@/lib/route/types";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
  "https://tiles.openfreemap.org/styles/liberty";

export type MapProject = {
  id: string;
  city?: string;
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

function persistCityCookie(pickerId: string) {
  try {
    document.cookie = `${CITY_COOKIE}=${encodeURIComponent(pickerId)};path=/;max-age=31536000;samesame=lax`.replace(
      "samesame",
      "samesite",
    );
  } catch {
    // ignore
  }
}

type Props = {
  projects: MapProject[];
  /** Preferred / default CityCode for first load */
  city?: string;
};

export function MapView({ projects: initialProjects, city: initialCity }: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<MapProject | null>(
    null,
  );
  const [mapReady, setMapReady] = useState(false);
  const [filters, setFilters] = useState<MapFilterState>(DEFAULT_MAP_FILTERS);
  const [projects, setProjects] = useState<MapProject[]>(initialProjects);
  const [pinsLoading, setPinsLoading] = useState(initialProjects.length === 0);
  const [pinCount, setPinCount] = useState<number | null>(
    initialProjects.length ? initialProjects.length : null,
  );
  const [pinsTruncated, setPinsTruncated] = useState(false);
  const [activeCity, setActiveCity] = useState(initialCity || "nyc");
  const [visibleCities, setVisibleCities] = useState<string[]>([
    initialCity || "nyc",
  ]);
  const [routeOpen, setRouteOpen] = useState(false);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [agentBanner, setAgentBanner] = useState<string | null>(null);
  const fetchGen = useRef(0);
  const cityRef = useRef(activeCity);
  cityRef.current = activeCity;
  const overlayOpen = Boolean(selectedSnapshot);
  const overlayOpenRef = useRef(overlayOpen);
  overlayOpenRef.current = overlayOpen;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const pin = params.get("pin");
    if (pin) {
      setSelectedSnapshot((prev) =>
        prev?.id === pin
          ? prev
          : {
              id: pin,
              latitude: 0,
              longitude: 0,
              score: 0,
              address: "Loading…",
              estValueLow: 0,
              estValueHigh: 0,
              buyingWindowEstimate: "",
              phase: "pre_construction",
            },
      );
    }
    // Agent Plan My Day lands with route already saved — keep panel closed so
    // the map + Start FAB are the focus (manual ?route=1 still opens the panel).
    const fromAgent = params.get("agent") === "1";
    if (params.get("route") === "1" && !fromAgent) setRouteOpen(true);
    const saved = loadMapRoute();
    if (saved?.stops?.length) {
      setRoute(saved);
      if (fromAgent || saved.agentMessage) {
        setAgentBanner(
          saved.agentMessage ||
            `Found ${saved.stopCount} strong opportunities near you today`,
        );
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const select = (id: string | null) => {
      if (!id) {
        setSelectedSnapshot(null);
        return;
      }
      const found = projectsRef.current.find((p) => p.id === id);
      if (found) setSelectedSnapshot(found);
      else {
        setSelectedSnapshot({
          id,
          latitude: 0,
          longitude: 0,
          score: 0,
          address: "Loading…",
          estValueLow: 0,
          estValueHigh: 0,
          buyingWindowEstimate: "",
          phase: "pre_construction",
        });
      }
    };
    (window as unknown as { __pcSelectProject?: (id: string | null) => void }).__pcSelectProject =
      select;
    return () => {
      delete (window as unknown as { __pcSelectProject?: (id: string | null) => void })
        .__pcSelectProject;
    };
  }, []);

  const projectsRef = useRef(projects);
  projectsRef.current = projects;

  // Hydrate deep-linked / stub selection once pins arrive
  useEffect(() => {
    if (!selectedSnapshot) return;
    const found = projects.find((p) => p.id === selectedSnapshot.id);
    if (found) {
      setSelectedSnapshot((prev) =>
        prev && prev.id === found.id && prev.latitude === found.latitude
          ? prev
          : found,
      );
    }
  }, [projects, selectedSnapshot?.id]);

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  useEffect(() => {
    setFilters(getMapFilters());
  }, []);

  function updateFilters(next: MapFilterState) {
    setFilters(next);
    setMapFilters(next);
  }

  const selectedScore = selectedSnapshot
    ? effectivePinScore(selectedSnapshot, filters.scoreMode)
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

  const fetchPins = (bounds: LonLatBounds, opts?: { preferCity?: string }) => {
    const gen = ++fetchGen.current;
    const prefer = opts?.preferCity ?? cityRef.current;
    const intersecting = citiesIntersectingBounds(bounds);
    // Single-metro: keep fast city-scoped fetch. Multi-metro viewport: only cities in view.
    const scope =
      intersecting.length <= 1
        ? intersecting.length === 1
          ? intersecting
          : prefer
            ? [prefer]
            : []
        : intersecting;

    setVisibleCities(scope.length ? scope : [prefer]);

    const qs = new URLSearchParams({
      west: String(bounds.west),
      south: String(bounds.south),
      east: String(bounds.east),
      north: String(bounds.north),
      limit: String(MAP_PIN_DEFAULT_LIMIT),
    });
    if (scope.length === 1) {
      qs.set("city", scope[0]!);
    } else if (scope.length > 1) {
      qs.set("cities", scope.join(","));
    } else if (prefer) {
      qs.set("city", prefer);
    }

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

  // First load / metro jump — city-scoped bounds (fast).
  useEffect(() => {
    const cityBounds = boundsForCity(activeCity);
    setPinsLoading(true);
    void fetchPins(cityBounds, { preferCity: activeCity });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCity]);

  // Fit camera when metro changes (picker or prop).
  const prevCityRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (prevCityRef.current !== undefined && prevCityRef.current !== activeCity) {
      clearMapCamera();
      const map = mapRef.current;
      if (map) {
        const b = boundsForCity(activeCity);
        map.fitBounds(
          [
            [b.west, b.south],
            [b.east, b.north],
          ],
          {
            padding: { top: 56, bottom: 72, left: 28, right: 28 },
            pitch: DEFAULT_MAP_CAMERA.pitch,
            bearing: DEFAULT_MAP_CAMERA.bearing,
            duration: 700,
            essential: true,
          },
        );
      }
    }
    prevCityRef.current = activeCity;
  }, [activeCity]);

  // Sync prop city from SSR / navigation
  useEffect(() => {
    if (initialCity && initialCity !== activeCity) {
      setActiveCity(initialCity);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCity]);

  // Viewport refetch on pan/zoom — progressive multi-city when zoomed out.
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
      captureCamera(map);
    };

    const onMoveEnd = () => {
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
  }, [mapReady, activeCity]);

  // Pause map drag while overlay is open — prevents gesture fighting with the sheet.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (overlayOpen) {
      map.dragPan.disable();
      map.scrollZoom.disable();
      map.boxZoom.disable();
      map.dragRotate.disable();
      map.touchZoomRotate.disable();
    } else {
      map.dragPan.enable({ deceleration: 2500, linearity: 0.3 });
      map.scrollZoom.enable();
      map.boxZoom.enable();
      map.dragRotate.enable();
      map.touchZoomRotate.enable();
    }
  }, [overlayOpen, mapReady]);

  // Init map once
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

  // Push GeoJSON — do NOT call map.resize() on every data update (that was fighting drag).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const sourceId = "projects";
    const existing = map.getSource(sourceId) as GeoJSONSource | undefined;
    if (existing) {
      existing.setData(geojson);
      return;
    }

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
      if (overlayOpenRef.current) return;
      const feature = e.features?.[0];
      if (!feature) return;
      const id = feature.properties?.id as string | undefined;
      if (!id) return;
      captureCamera(map);
      const found = projectsRef.current.find((p) => p.id === id);
      if (found) setSelectedSnapshot(found);
      else {
        const coords =
          feature.geometry?.type === "Point"
            ? feature.geometry.coordinates
            : [0, 0];
        setSelectedSnapshot({
          id,
          latitude: coords[1] ?? 0,
          longitude: coords[0] ?? 0,
          score: Number(feature.properties?.score) || 0,
          address: String(feature.properties?.address || "Project"),
          estValueLow: 0,
          estValueHigh: 0,
          buyingWindowEstimate: "",
          phase: "pre_construction",
        });
      }
    };

    map.on("mouseenter", "project-pins", onEnter);
    map.on("mouseleave", "project-pins", onLeave);
    map.on("click", "project-pins", onClickPin);
    map.on("click", "project-scores", onClickPin);
    map.resize();
  }, [geojson, mapReady]);

  // Daily route line + numbered stops on the same map.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const lineId = "daily-route-line";
    const stopsId = "daily-route-stops";
    const empty: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [],
    };

    const stops = route?.stops?.length
      ? [...route.stops].sort((a, b) => a.visitOrder - b.visitOrder)
      : [];

    const lineFc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features:
        stops.length >= 2
          ? [
              {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: [
                    ...(route?.start
                      ? [[route.start.longitude, route.start.latitude] as [number, number]]
                      : []),
                    ...stops.map(
                      (s) =>
                        [s.longitude, s.latitude] as [number, number],
                    ),
                  ],
                },
              },
            ]
          : [],
    };

    const stopsFc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: stops.map((s) => ({
        type: "Feature" as const,
        id: s.id,
        properties: {
          id: s.id,
          visitOrder: s.visitOrder,
          address: s.address,
          score: s.score,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [s.longitude, s.latitude],
        },
      })),
    };

    const ensureSource = (
      id: string,
      data: GeoJSON.FeatureCollection,
    ) => {
      const existing = map.getSource(id) as GeoJSONSource | undefined;
      if (existing) {
        existing.setData(data);
        return;
      }
      map.addSource(id, { type: "geojson", data });
    };

    ensureSource(lineId, stops.length ? lineFc : empty);
    ensureSource(stopsId, stops.length ? stopsFc : empty);

    if (!map.getLayer("daily-route-path")) {
      map.addLayer({
        id: "daily-route-path",
        type: "line",
        source: lineId,
        paint: {
          "line-color": "#111827",
          "line-width": 4,
          "line-opacity": 0.9,
        },
      });
      map.addLayer({
        id: "daily-route-stop-halo",
        type: "circle",
        source: stopsId,
        paint: {
          "circle-radius": 14,
          "circle-color": "#111827",
          "circle-opacity": 0.2,
        },
      });
      map.addLayer({
        id: "daily-route-stop-circle",
        type: "circle",
        source: stopsId,
        paint: {
          "circle-radius": 11,
          "circle-color": "#111827",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
      map.addLayer({
        id: "daily-route-stop-label",
        type: "symbol",
        source: stopsId,
        layout: {
          "text-field": ["to-string", ["get", "visitOrder"]],
          "text-size": 12,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      const onEnter = () => {
        map.getCanvas().style.cursor = "pointer";
      };
      const onLeave = () => {
        map.getCanvas().style.cursor = "";
      };
      const onClickStop = (e: MapLayerMouseEvent) => {
        if (overlayOpenRef.current) return;
        const feature = e.features?.[0];
        const id = feature?.properties?.id as string | undefined;
        if (!id) return;
        const stop = route?.stops.find((s) => s.id === id);
        if (!stop) return;
        captureCamera(map);
        setSelectedSnapshot({
          id: stop.id,
          latitude: stop.latitude,
          longitude: stop.longitude,
          score: stop.score,
          address: stop.address,
          borough: stop.borough,
          zip: stop.zip,
          city: stop.city,
          estValueLow: stop.estValueLow,
          estValueHigh: stop.estValueHigh,
          buyingWindowEstimate: stop.buyingWindowEstimate,
          phase: "interior_finishing",
        });
      };
      map.on("mouseenter", "daily-route-stop-circle", onEnter);
      map.on("mouseleave", "daily-route-stop-circle", onLeave);
      map.on("click", "daily-route-stop-circle", onClickStop);
      map.on("click", "daily-route-stop-label", onClickStop);
    }

    if (stops.length >= 1) {
      const b = new LngLatBounds();
      if (route?.start) {
        b.extend([route.start.longitude, route.start.latitude]);
      }
      for (const s of stops) b.extend([s.longitude, s.latitude]);
      map.fitBounds(b, {
        padding: { top: 80, bottom: 120, left: 48, right: 48 },
        maxZoom: 14,
        duration: 700,
        essential: true,
      });
    }
  }, [route, mapReady]);

  function onCityPick(cityCode: string, pickerId: string) {
    persistCityCookie(pickerId);
    setActiveCity(cityCode);
    setSelectedSnapshot(null);
    router.replace(`/app/map?city=${encodeURIComponent(pickerId)}`, {
      scroll: false,
    });
  }

  const cityBadgeLabel =
    visibleCities.length > 1
      ? `${visibleCities.length} metros`
      : (activeCity || "map").replace(/_/g, " ");

  return (
    <div className="relative h-full min-h-0 w-full flex-1">
      <div
        ref={containerRef}
        className="absolute inset-0 h-full w-full bg-[#dfe7ef]"
        aria-label="Construction opportunities map"
        role="application"
      />

      <div className="pointer-events-none absolute left-3 top-3 z-30 md:left-5 md:top-4">
        <p className="rounded-full border border-line bg-white/95 px-3 py-1.5 text-[11px] font-bold text-ink shadow-sm backdrop-blur">
          {cityBadgeLabel}
          {pinCount != null ? ` · ${pinCount.toLocaleString()} in view` : ""}
          {pinsTruncated ? " · top scores" : ""}
        </p>
      </div>

      {pinsLoading && projects.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div className="rounded-2xl border border-line bg-white/95 px-4 py-3 text-sm font-semibold text-slate shadow-md backdrop-blur">
            Loading pins…
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute right-3 top-3 z-50 flex items-start gap-2 md:right-5 md:top-4">
        <MapCityPicker value={activeCity} onChange={onCityPick} />
        <MapRoutePanel
          city={activeCity}
          open={routeOpen}
          onOpenChange={setRouteOpen}
          route={route}
          onRouteChange={(next) => {
            setRoute(next);
            // Manual regenerate clears agent framing.
            if (!next?.agentMessage) setAgentBanner(null);
          }}
        />
        <MapFilters value={filters} onChange={updateFilters} />
      </div>

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

      {agentBanner && !selectedSnapshot ? (
        <PlanMyDayAgentBanner
          message={agentBanner}
          onDismiss={() => setAgentBanner(null)}
        />
      ) : null}

      {!selectedSnapshot && (
        <MapRouteStartFab
          mapsUrl={route?.fullRouteUrl ?? null}
          stopCount={route?.stopCount ?? 0}
        />
      )}

      <ProjectDetailOverlay
        project={selectedSnapshot}
        open={Boolean(selectedSnapshot)}
        onClose={() => {
          setSelectedSnapshot(null);
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            if (url.searchParams.has("pin")) {
              url.searchParams.delete("pin");
              router.replace(url.pathname + url.search, { scroll: false });
            }
          }
        }}
        onDirections={(next) => {
          setRoute(next);
          setSelectedSnapshot(null);
          setRouteOpen(false);
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            url.searchParams.delete("pin");
            url.searchParams.set("route", "1");
            router.replace(url.pathname + url.search, { scroll: false });
          }
        }}
        displayScore={selectedScore}
      />
    </div>
  );
}
