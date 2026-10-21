"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type MapLayerMouseEvent,
  LngLatBounds,
} from "maplibre-gl";
import { AnimatePresence, motion } from "framer-motion";
import {
  DEFAULT_MAP_FILTERS,
  MapFilters,
  type MapFilterState,
} from "@/components/app/MapFilters";
import { MapPinLegend } from "@/components/app/MapPinLegend";
import { ProjectDetailOverlay } from "@/components/app/ProjectDetailOverlay";
import type { MapProject } from "@/components/app/MapView";
import { Logo } from "@/components/brand/Logo";
import { PricingCards } from "./PricingCards";
import { AskProcurity } from "./AskProcurity";
import { PICKER_CITIES, CITY_COOKIE, type PickerCity } from "@/lib/cities/picker";
import {
  TEASER_FREE_VIEWS,
  TEASER_VIEWS_LOCAL_KEY,
} from "@/lib/teaser/constants";
import {
  effectivePinScore,
  filterPins,
  pinColorForScorePublic,
  type FilterablePin,
} from "@/lib/map/pin-filters";
import { applyWarmBasemap } from "@/lib/map/warm-basemap";
import {
  formatAskResultLine,
  type AskIntent,
} from "@/lib/marketing/ask-procurity";
import { cn } from "@/lib/cn";
import type { ProjectPhase } from "@/lib/db/types";
import { IphoneAppSection } from "./IphoneAppSection";
import { HomeVideoSection } from "./HomeVideoSection";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const STYLE_PRIMARY =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
  "https://tiles.openfreemap.org/styles/liberty";
const STYLE_FALLBACK = "https://demotiles.maplibre.org/style.json";
const STYLE_LOAD_TIMEOUT_MS = 6000;

const SERVED = PICKER_CITIES.filter((c) => c.served);

function cityById(id: string): PickerCity {
  return SERVED.find((c) => c.id === id) ?? SERVED[0]!;
}

function readLocalViews(): string[] {
  try {
    const raw = localStorage.getItem(TEASER_VIEWS_LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

function writeLocalViews(ids: string[]) {
  try {
    localStorage.setItem(
      TEASER_VIEWS_LOCAL_KEY,
      JSON.stringify([...new Set(ids)].slice(0, TEASER_FREE_VIEWS)),
    );
  } catch {
    // ignore
  }
}

function setCityCookie(cityId: string) {
  try {
    document.cookie = `${CITY_COOKIE}=${encodeURIComponent(cityId)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  } catch {
    // ignore
  }
}

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type TeaserPin = FilterablePin & {
  projectType?: string;
};

type Props = {
  initialCityId: string;
};

export function HomeMapHero({ initialCityId }: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const pinsRef = useRef<TeaserPin[]>([]);
  const cityRef = useRef(cityById(initialCityId));
  const styleIndexRef = useRef(0);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fittedRef = useRef(false);
  const paywallRef = useRef(false);
  const revealDoneRef = useRef(false);
  const askTypeRef = useRef<string[] | null>(null);

  const [ready, setReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const [pins, setPins] = useState<TeaserPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<MapFilterState>(DEFAULT_MAP_FILTERS);
  const [askTypeKeywords, setAskTypeKeywords] = useState<string[] | null>(null);
  const [viewedIds, setViewedIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<MapProject | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [paywallMessage, setPaywallMessage] = useState(
    "You've explored 3 projects. Pick a plan to keep going.",
  );
  const [proofLine, setProofLine] = useState<string | null>(null);

  const city = cityRef.current;
  const remaining = Math.max(0, TEASER_FREE_VIEWS - viewedIds.length);
  const signupHref = `/signup?city=${encodeURIComponent(city.id)}&checkout=1&tier=growth`;

  useEffect(() => {
    setViewedIds(readLocalViews());
    setCityCookie(initialCityId);
  }, [initialCityId]);

  useEffect(() => {
    paywallRef.current = paywall;
  }, [paywall]);

  useEffect(() => {
    askTypeRef.current = askTypeKeywords;
  }, [askTypeKeywords]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/teaser/stats")
      .then((r) => r.json())
      .then((d: { projectCount?: number; cityCount?: number }) => {
        if (cancelled) return;
        const n = Number(d.projectCount) || 0;
        const cities = Number(d.cityCount) || SERVED.length;
        if (n > 0) {
          setProofLine(
            `${n.toLocaleString()} commercial projects tracked across ${cities} cities`,
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    let rows = filterPins(pins, filters).map((p) => ({
      ...p,
      color: pinColorForScorePublic(p.displayScore),
    }));
    if (askTypeKeywords?.length) {
      const keys = askTypeKeywords.map((k) => k.toLowerCase());
      rows = rows.filter((p) => {
        const hay = `${p.projectType || ""} ${p.phase || ""}`.toLowerCase();
        return keys.some((k) => hay.includes(k));
      });
    }
    return rows;
  }, [pins, filters, askTypeKeywords]);

  const selectedScore = selected
    ? effectivePinScore(selected, filters.scoreMode)
    : 0;

  const loadPins = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await fetch("/api/teaser/pins/all", {
        signal,
        cache: "default",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { pins?: TeaserPin[] };
      const next = Array.isArray(data.pins) ? data.pins : [];
      pinsRef.current = next;
      setPins(next);
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") return;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void loadPins(ac.signal);
    return () => ac.abort();
  }, [loadPins]);

  const paintPins = useCallback(
    (map: MapLibreMap, rows: typeof filtered) => {
      const source = map.getSource("projects") as GeoJSONSource | undefined;
      if (!source) return;
      source.setData({
        type: "FeatureCollection",
        features: rows.map((p, i) => ({
          type: "Feature",
          id: i + 1,
          properties: {
            id: p.id,
            score: p.displayScore,
            color: p.color,
            phase: p.phase,
            city: p.city || "",
            projectType: p.projectType || "",
          },
          geometry: {
            type: "Point",
            coordinates: [p.longitude, p.latitude],
          },
        })),
      });
    },
    [],
  );

  /** First-load signature: reveal pins cool → hot with a brief hot glow. */
  const revealPinsInScoreOrder = useCallback(
    (map: MapLibreMap, rows: typeof filtered) => {
      if (revealDoneRef.current) {
        paintPins(map, rows);
        return;
      }
      revealDoneRef.current = true;
      if (prefersReducedMotion() || rows.length === 0) {
        paintPins(map, rows);
        return;
      }

      const sorted = [...rows].sort((a, b) => a.displayScore - b.displayScore);
      const buckets = 8;
      let step = 0;

      const tick = () => {
        step += 1;
        const take = Math.ceil((sorted.length * step) / buckets);
        const slice = sorted.slice(0, take);
        paintPins(map, slice);
        if (step < buckets) {
          window.setTimeout(tick, 70);
        } else {
          // brief glow on hottest pins via halo opacity pulse
          try {
            if (map.getLayer("project-pins-halo")) {
              map.setPaintProperty("project-pins-halo", "circle-opacity", [
                "case",
                [">=", ["get", "score"], 90],
                0.45,
                0.22,
              ]);
              window.setTimeout(() => {
                try {
                  map.setPaintProperty(
                    "project-pins-halo",
                    "circle-opacity",
                    0.22,
                  );
                } catch {
                  // ignore
                }
              }, 900);
            }
          } catch {
            // ignore
          }
        }
      };
      paintPins(map, []);
      window.setTimeout(tick, 40);
    },
    [paintPins],
  );

  const addLayers = useCallback((map: MapLibreMap) => {
    if (map.getSource("projects")) return;
    map.addSource("projects", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
      cluster: true,
      clusterMaxZoom: 11,
      clusterRadius: 52,
    });
    map.addLayer({
      id: "project-clusters",
      type: "circle",
      source: "projects",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": "#F26B3A",
        "circle-radius": ["step", ["get", "point_count"], 16, 25, 22, 100, 28],
        "circle-opacity": 0.9,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#FBF7F0",
      },
    });
    map.addLayer({
      id: "project-cluster-count",
      type: "symbol",
      source: "projects",
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-size": 12,
      },
      paint: { "text-color": "#FBF7F0" },
    });
    map.addLayer({
      id: "project-pins-halo",
      type: "circle",
      source: "projects",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-radius": 12,
        "circle-color": ["get", "color"],
        "circle-opacity": 0.22,
      },
    });
    map.addLayer({
      id: "project-pins",
      type: "circle",
      source: "projects",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-radius": 8,
        "circle-color": ["get", "color"],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#FBF7F0",
      },
    });
    map.addLayer({
      id: "project-scores",
      type: "symbol",
      source: "projects",
      filter: ["!", ["has", "point_count"]],
      minzoom: 12,
      layout: {
        "text-field": ["to-string", ["get", "score"]],
        "text-size": 10,
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: {
        "text-color": "#FBF7F0",
        "text-halo-color": "rgba(20,33,61,0.35)",
        "text-halo-width": 0.5,
      },
    });
  }, []);

  const fitCity = useCallback(
    (map: MapLibreMap, all: TeaserPin[], opts?: { glide?: boolean }) => {
      const cityPins = all.filter((p) => p.city === cityRef.current.id);
      const use = cityPins.length ? cityPins : all;
      const duration = opts?.glide && !prefersReducedMotion() ? 1400 : 700;
      if (!use.length) {
        map.easeTo({
          center: cityRef.current.center,
          zoom: cityRef.current.zoom,
          duration,
          easing: (t) => 1 - Math.pow(1 - t, 3),
        });
        return;
      }
      const bounds = new LngLatBounds();
      for (const p of use) bounds.extend([p.longitude, p.latitude]);
      map.fitBounds(bounds, {
        padding: { top: 160, bottom: 80, left: 48, right: 48 },
        maxZoom: 12,
        duration,
        essential: true,
        easing: (t) => 1 - Math.pow(1 - t, 3),
      });
    },
    [],
  );

  // Map init — wrapper sizing avoids MapLibre position:relative height collapse
  useEffect(() => {
    const wrap = wrapperRef.current;
    const el = containerRef.current;
    if (!wrap || !el) return;

    let cancelled = false;
    let map: MapLibreMap | null = null;
    let ro: ResizeObserver | null = null;
    let raf = 0;

    const clearTimer = () => {
      if (loadTimerRef.current) {
        clearTimeout(loadTimerRef.current);
        loadTimerRef.current = null;
      }
    };

    const tryFallback = () => {
      if (cancelled || !map) return;
      clearTimer();
      if (styleIndexRef.current === 0) {
        styleIndexRef.current = 1;
        try {
          map.setStyle(STYLE_FALLBACK, { diff: false });
          armTimer();
        } catch {
          setMapFailed(true);
        }
        return;
      }
      setMapFailed(true);
    };

    const armTimer = () => {
      clearTimer();
      loadTimerRef.current = setTimeout(() => {
        if (cancelled || map?.loaded()) return;
        tryFallback();
      }, STYLE_LOAD_TIMEOUT_MS);
    };

    const onLoad = () => {
      if (cancelled || !map) return;
      clearTimer();
      setMapFailed(false);
      try {
        applyWarmBasemap(map);
        if (!map.getSource("projects")) addLayers(map);
        const rows = filterPins(pinsRef.current, filters).map((p) => ({
          ...p,
          color: pinColorForScorePublic(p.displayScore),
        }));
        if (!fittedRef.current) {
          // Start slightly pulled back, then glide in
          if (!prefersReducedMotion()) {
            map.jumpTo({
              center: cityRef.current.center,
              zoom: Math.max(9, cityRef.current.zoom - 1.4),
            });
          }
          fitCity(map, pinsRef.current, { glide: true });
          fittedRef.current = true;
          revealPinsInScoreOrder(map, rows);
        } else {
          paintPins(map, rows);
        }
        map.resize();
        setReady(true);
      } catch {
        tryFallback();
      }
    };

    const init = () => {
      if (cancelled || !wrapperRef.current || !containerRef.current) return;
      const { width, height } = wrapperRef.current.getBoundingClientRect();
      if (width < 2 || height < 2) {
        raf = requestAnimationFrame(init);
        return;
      }
      styleIndexRef.current = 0;
      fittedRef.current = false;
      revealDoneRef.current = false;
      setReady(false);
      setMapFailed(false);

      map = new MapLibreMap({
        container: containerRef.current,
        style: STYLE_PRIMARY,
        center: cityRef.current.center,
        zoom: cityRef.current.zoom,
        maxPitch: 45,
        attributionControl: {},
      });
      map.addControl(
        new NavigationControl({ visualizePitch: false }),
        "bottom-right",
      );
      mapRef.current = map;
      (window as unknown as { __pcHomeMap?: MapLibreMap }).__pcHomeMap = map;

      map.on("load", onLoad);
      map.on("styledata", () => {
        if (map && map.isStyleLoaded()) applyWarmBasemap(map);
      });
      map.on("error", (e) => {
        const msg = String(
          (e as unknown as { error?: { message?: string } }).error?.message || e,
        );
        if (/style|Failed to fetch|AJAXError|network/i.test(msg)) tryFallback();
      });
      armTimer();

      ro = new ResizeObserver(() => map?.resize());
      ro.observe(wrapperRef.current);
    };

    raf = requestAnimationFrame(init);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearTimer();
      ro?.disconnect();
      map?.remove();
      mapRef.current = null;
      try {
        delete (window as unknown as { __pcHomeMap?: MapLibreMap }).__pcHomeMap;
      } catch {
        // ignore
      }
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addLayers, fitCity, mapKey, paintPins, revealPinsInScoreOrder]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    paintPins(map, filtered);
    if (!fittedRef.current && pins.length > 0) {
      fitCity(map, pins, { glide: true });
      fittedRef.current = true;
    }
  }, [filtered, ready, paintPins, fitCity, pins]);

  const openProject = useCallback(
    (id: string, lat: number, lng: number, score: number, label: string) => {
      if (paywallRef.current) {
        setPaywall(true);
        return;
      }
      const found = pinsRef.current.find((p) => p.id === id);
      setSelected({
        id,
        latitude: lat,
        longitude: lng,
        score: found?.score ?? score,
        tradeScores: found?.tradeScores ?? undefined,
        address: label || "Project",
        estValueLow: 0,
        estValueHigh: 0,
        buyingWindowEstimate: "",
        phase: (found?.phase as ProjectPhase) || "pre_construction",
        city: found?.city,
        updatedAt: found?.updatedAt ?? undefined,
      });
      setOverlayOpen(true);
    },
    [],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const onPin = (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f) return;
      const id = f.properties?.id as string | undefined;
      if (!id) return;
      const coords =
        f.geometry.type === "Point"
          ? (f.geometry.coordinates as [number, number])
          : [0, 0];
      openProject(
        id,
        coords[1],
        coords[0],
        Number(f.properties?.score) || 0,
        String(f.properties?.projectType || "Project"),
      );
    };

    const onCluster = async (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f) return;
      const clusterId = f.properties?.cluster_id as number | undefined;
      if (clusterId == null) return;
      const source = map.getSource("projects") as GeoJSONSource;
      try {
        const zoom = await source.getClusterExpansionZoom(clusterId);
        const geom = f.geometry as unknown as {
          type: string;
          coordinates: [number, number];
        };
        map.easeTo({
          center: geom.coordinates,
          zoom,
          duration: 400,
          easing: (t) => 1 - Math.pow(1 - t, 3),
        });
      } catch {
        // ignore
      }
    };

    map.on("click", "project-pins", onPin);
    map.on("click", "project-scores", onPin);
    map.on("click", "project-clusters", onCluster);
    map.on("mouseenter", "project-pins", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "project-pins", () => {
      map.getCanvas().style.cursor = "";
    });
    map.on("mouseenter", "project-clusters", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "project-clusters", () => {
      map.getCanvas().style.cursor = "";
    });

    return () => {
      map.off("click", "project-pins", onPin);
      map.off("click", "project-scores", onPin);
      map.off("click", "project-clusters", onCluster);
    };
  }, [ready, openProject]);

  function showPaywall(message?: string) {
    if (message) setPaywallMessage(message);
    setOverlayOpen(false);
    setSelected(null);
    setPaywall(true);
  }

  function handleOverlayClose() {
    const nextRemaining = Math.max(0, TEASER_FREE_VIEWS - viewedIds.length);
    setOverlayOpen(false);
    setSelected(null);
    if (nextRemaining === 0 && viewedIds.length >= TEASER_FREE_VIEWS) {
      showPaywall();
    }
  }

  function applyAskIntent(intent: AskIntent): { resultLine: string } {
    setFilters(intent.filters);
    setAskTypeKeywords(intent.typeKeywords ?? null);

    if (intent.cityId) {
      const next = cityById(intent.cityId);
      cityRef.current = next;
      setCityCookie(next.id);
      const map = mapRef.current;
      if (map) {
        const cityPins = pinsRef.current.filter((p) => p.city === next.id);
        fitCity(map, cityPins.length ? cityPins : pinsRef.current, {
          glide: true,
        });
      }
    }

    // Compute result against the intent filters + type keywords
    let rows = filterPins(pinsRef.current, intent.filters);
    if (intent.typeKeywords?.length) {
      const keys = intent.typeKeywords.map((k) => k.toLowerCase());
      rows = rows.filter((p) => {
        const hay = `${(p as TeaserPin).projectType || ""} ${p.phase || ""}`.toLowerCase();
        return keys.some((k) => hay.includes(k));
      });
    }
    if (intent.cityId) {
      rows = rows.filter((p) => p.city === intent.cityId);
    }
    const hotCount = rows.filter((p) => p.displayScore >= 85).length;
    const cityLabel = intent.cityId
      ? cityById(intent.cityId).shortLabel
      : undefined;
    return {
      resultLine: formatAskResultLine({
        count: rows.length,
        cityLabel,
        hotCount,
      }),
    };
  }

  return (
    <>
      <section className="relative h-[100dvh] w-full overflow-hidden bg-[#EDE6DA]">
        <div
          ref={wrapperRef}
          className={cn(
            "absolute inset-0",
            paywall && "pointer-events-none brightness-[0.55]",
          )}
        >
          <div
            ref={containerRef}
            className="h-full w-full"
            role="application"
            aria-label="Map of new construction projects"
          />
        </div>

        {/* Top bar: 64px + safe-area, solid paper, no blur */}
        <header
          className="pointer-events-none absolute inset-x-0 top-0 z-30"
          style={{
            paddingTop: "env(safe-area-inset-top, 0px)",
          }}
        >
          <div
            className="pointer-events-auto flex h-16 items-center justify-between border-b border-[#E7DFD0]/80 bg-[#FBF7F0]/92 pl-5 pr-3 md:pl-6 md:pr-5"
            data-testid="home-topbar"
          >
            <Link
              href="/"
              className="flex h-full shrink-0 items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
              aria-label="Procurity home"
            >
              <Logo variant="dark" size={28} />
            </Link>
            <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
              <Link
                href="#pricing"
                className="inline-flex h-10 items-center px-2.5 text-sm font-medium text-[#14213D] hover:opacity-80 sm:px-3"
              >
                Pricing
              </Link>
              <Link
                href="/login"
                className="mkt-btn-ghost inline-flex h-10 items-center rounded-lg px-2.5 text-sm font-medium sm:px-3"
              >
                Log in
              </Link>
              <Link
                href={signupHref.replace("&checkout=1&tier=growth", "")}
                className="mkt-btn-primary inline-flex h-10 items-center rounded-lg px-3.5 text-sm font-medium"
              >
                Start free
              </Link>
            </nav>
          </div>
        </header>

        {/* Left-aligned hero copy + Ask Procurity on the map */}
        <div className="pointer-events-none absolute inset-x-0 top-[calc(4rem+env(safe-area-inset-top,0px))] z-20 px-5 pt-4 md:px-8 md:pt-6">
          <div className="max-w-xl">
            <h1 className="font-display text-[1.75rem] leading-[1.15] tracking-tight text-[#14213D] sm:text-3xl md:text-4xl">
              Know which projects are about to need you.
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[#5B6475] md:text-base">
              Spot the sites heating up for signage, lighting, glass, security,
              and flooring — before your competitors do.
            </p>
            <div className="pointer-events-auto mt-4">
              <AskProcurity onApply={applyAskIntent} />
            </div>
            <p className="mt-2 text-[11px] font-medium text-[#5B6475]">
              {remaining} free view{remaining === 1 ? "" : "s"} left
            </p>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-[calc(4rem+env(safe-area-inset-top,0px)+11.5rem)] z-20 flex justify-center px-3 sm:top-[calc(4rem+env(safe-area-inset-top,0px)+10rem)] md:top-auto md:bottom-28 md:left-5 md:right-auto md:justify-start md:px-0">
          <div className="pointer-events-auto max-w-full">
            <MapFilters value={filters} onChange={setFilters} />
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-3 left-3 z-20 md:bottom-6 md:left-5">
          <MapPinLegend scoreMode={filters.scoreMode} publicRamp />
        </div>

        {loading && (
          <div className="pointer-events-none absolute inset-x-0 bottom-24 z-10 flex justify-center">
            <span className="rounded-lg border border-[#E7DFD0] bg-[#FBF7F0] px-4 py-2 text-xs font-medium text-[#14213D]">
              Loading projects…
            </span>
          </div>
        )}

        {mapFailed && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#EDE6DA] px-4">
            <div className="flex max-w-sm flex-col items-center gap-3 rounded-xl border border-[#E7DFD0] bg-[#FBF7F0] px-5 py-6 text-center">
              <p className="text-sm font-medium text-[#14213D]">
                The map didn&apos;t load. Retry
              </p>
              <button
                type="button"
                onClick={() => {
                  fittedRef.current = false;
                  revealDoneRef.current = false;
                  styleIndexRef.current = 0;
                  setMapFailed(false);
                  setMapKey((k) => k + 1);
                }}
                className="mkt-btn-primary inline-flex h-11 min-w-[120px] items-center justify-center rounded-lg px-4 text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <ProjectDetailOverlay
          mode="public"
          project={selected}
          open={overlayOpen && Boolean(selected) && !paywall}
          onClose={handleOverlayClose}
          displayScore={selectedScore}
          onDirections={(route) => {
            if (route.fullRouteUrl) {
              window.open(route.fullRouteUrl, "_blank", "noopener,noreferrer");
            }
          }}
          onRequirePlan={(reason) => {
            showPaywall(
              reason === "start_job"
                ? "Start a job with a plan"
                : "You've explored 3 projects. Pick a plan to keep going.",
            );
          }}
          onPublicViewed={({ projectId, viewedCount }) => {
            const next = [...new Set([...readLocalViews(), projectId])].slice(
              0,
              TEASER_FREE_VIEWS,
            );
            writeLocalViews(next);
            setViewedIds(next);
            if (viewedCount >= TEASER_FREE_VIEWS) {
              // paywall after close — handled in handleOverlayClose
            }
          }}
        />

        <AnimatePresence>
          {paywall && (
            <>
              <motion.button
                type="button"
                aria-label="Dismiss"
                className="absolute inset-0 z-40 bg-[#14213D]/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => setPaywall(false)}
              />
              <motion.div
                role="dialog"
                aria-modal
                className="absolute inset-x-0 bottom-0 z-50 mx-auto max-h-[min(85dvh,720px)] w-full max-w-4xl overflow-y-auto rounded-t-2xl border border-[#E7DFD0] bg-[#FBF7F0] p-5 sm:p-8"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#E7DFD0]" />
                <h2 className="font-display text-center text-2xl tracking-tight text-[#14213D] sm:text-3xl">
                  {paywallMessage.includes("Start a job")
                    ? "Start a job with a plan"
                    : "You've explored 3 projects. Pick a plan to keep going."}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-center text-sm text-[#5B6475]">
                  Your city ({city.shortLabel}) carries into signup and checkout.
                </p>
                <div className="mt-6">
                  <PricingCards
                    variant="marketing"
                    ctaHref={signupHref.replace(
                      "&checkout=1&tier=growth",
                      "",
                    )}
                  />
                </div>
                <p className="mt-6 text-center text-sm text-[#5B6475]">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-medium text-[#2563EB] underline-offset-2 hover:underline"
                  >
                    Log in
                  </Link>
                </p>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </section>

      {proofLine && (
        <p
          className="border-b border-[#E7DFD0] px-5 py-4 text-center text-sm text-[#5B6475] md:px-10"
          data-testid="proof-line"
        >
          {proofLine}
        </p>
      )}
    </>
  );
}

const HOW_STEPS = [
  {
    n: "01",
    title: "See what's heating up on the map",
    body: "Heat-colored dots show which sites are ready for outreach — cool to hot.",
    crop: "map",
  },
  {
    n: "02",
    title: "Open a project and check the street",
    body: "Tap a dot for the location card, score, and street view before you drive.",
    crop: "card",
  },
  {
    n: "03",
    title: "Quote and get paid in one place",
    body: "Take the lead from the map to a deposit without juggling five tools.",
    crop: "quote",
  },
] as const;

export function HomeBelowFold() {
  return (
    <div className="relative">
      <section className="px-5 py-16 md:px-10 md:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-3xl tracking-tight text-[#14213D] md:text-4xl">
            How it works
          </h2>
          <p className="mt-2 max-w-lg text-[#5B6475]">
            Three steps from the map to a paid job — no jargon, no filler.
          </p>
          <ol className="mt-12 space-y-16">
            {HOW_STEPS.map((s, i) => (
              <li
                key={s.n}
                className={cn(
                  "grid items-center gap-8 md:grid-cols-12 md:gap-10",
                  i % 2 === 1 && "md:[&>*:first-child]:order-2",
                )}
              >
                <div className="md:col-span-5">
                  <p className="text-sm font-medium tabular-nums text-[#2563EB]">
                    {s.n}
                  </p>
                  <h3 className="mt-2 font-display text-2xl tracking-tight text-[#14213D]">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#5B6475]">
                    {s.body}
                  </p>
                </div>
                <div className="md:col-span-7">
                  <HowCrop kind={s.crop} />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-[#E7DFD0] px-5 py-16 md:px-10 md:py-24">
        <div className="mx-auto grid max-w-5xl items-start gap-12 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-5">
            <IphoneAppSection embedded />
          </div>
          <div className="md:col-span-7 md:pt-8">
            <HomeVideoSection embedded />
          </div>
        </div>
      </section>

      <section
        id="pricing"
        className="border-t border-[#E7DFD0] px-5 py-16 md:px-10 md:py-24"
      >
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-3xl tracking-tight text-[#14213D] md:text-4xl">
            Simple pricing
          </h2>
          <p className="mt-2 max-w-md text-[#5B6475]">
            Start free. Upgrade when your coverage grows.
          </p>
          <div className="mt-10">
            <PricingCards variant="marketing" />
          </div>
        </div>
      </section>

      <section className="border-t border-[#E7DFD0] px-5 py-16 md:px-10">
        <div className="mx-auto max-w-5xl">
          <p className="font-display text-2xl tracking-tight text-[#14213D] md:text-3xl">
            Your next job is already on the map.
          </p>
          <Link
            href="/signup"
            className="mkt-btn-primary mt-6 inline-flex h-11 items-center rounded-lg px-5 text-sm font-medium"
          >
            Start free
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#E7DFD0] px-5 py-8 md:px-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Logo variant="dark" size={24} />
          <div className="flex flex-wrap gap-4 text-sm font-medium text-[#5B6475]">
            <Link href="/how-it-works" className="hover:text-[#14213D]">
              How it works
            </Link>
            <Link href="/pricing" className="hover:text-[#14213D]">
              Pricing
            </Link>
            <Link href="/login" className="hover:text-[#14213D]">
              Log in
            </Link>
            <Link href="/signup" className="hover:text-[#14213D]">
              Create account
            </Link>
          </div>
          <p className="text-xs text-[#5B6475]">
            © {new Date().getFullYear()} Procurity · Find your next job.
          </p>
        </div>
      </footer>
    </div>
  );
}

function HowCrop({ kind }: { kind: "map" | "card" | "quote" }) {
  if (kind === "map") {
    return (
      <div className="overflow-hidden rounded-xl border border-[#E7DFD0] bg-[#EDE6DA]">
        <div className="relative aspect-[16/10]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/hero-city-bg.png"
            alt=""
            className="h-full w-full object-cover opacity-90"
          />
          <div className="absolute inset-0 flex items-center justify-center gap-6">
            {[
              { c: "#9FB4CC", s: 10 },
              { c: "#F2B544", s: 12 },
              { c: "#F26B3A", s: 14 },
            ].map((d, i) => (
              <span
                key={i}
                className="rounded-full"
                style={{
                  width: d.s,
                  height: d.s,
                  background: d.c,
                  boxShadow: `0 0 0 2px #FBF7F0`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (kind === "card") {
    return (
      <div className="rounded-xl border border-[#E7DFD0] bg-[#FBF7F0] p-5">
        <div className="flex items-start gap-4">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full border-2 text-sm font-semibold tabular-nums text-[#14213D]"
            style={{ borderColor: "#F26B3A", color: "#F26B3A" }}
          >
            92
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#F26B3A]">
              Act now
            </p>
            <p className="mt-1 text-base font-medium text-[#14213D]">
              New hotel · finishing
            </p>
            <p className="mt-1 text-sm text-[#5B6475]">
              Street view ready · score explains why now
            </p>
          </div>
        </div>
        <div className="mt-4 h-px bg-[#E7DFD0]" />
        <p className="mt-3 text-sm text-[#5B6475]">
          Start a job when you&apos;re ready — contacts unlock on a plan.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-[#E7DFD0] bg-[#FBF7F0] p-5">
      <p className="text-xs font-medium text-[#5B6475]">Quote draft</p>
      <p className="mt-2 font-display text-xl text-[#14213D]">
        Exterior identity package
      </p>
      <div className="mt-4 space-y-2 border-t border-[#E7DFD0] pt-4 text-sm text-[#5B6475]">
        <div className="flex justify-between">
          <span>Channel letters</span>
          <span className="tabular-nums text-[#14213D]">$4,200</span>
        </div>
        <div className="flex justify-between">
          <span>Install</span>
          <span className="tabular-nums text-[#14213D]">$1,100</span>
        </div>
      </div>
      <div className="mt-4 flex h-10 items-center justify-center rounded-lg bg-[#2563EB] text-sm font-medium text-[#FBF7F0]">
        Send for deposit
      </div>
    </div>
  );
}
