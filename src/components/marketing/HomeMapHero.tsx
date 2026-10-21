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
import { MapPin, MessageSquare, Wallet } from "lucide-react";
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

  const [ready, setReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const [pins, setPins] = useState<TeaserPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<MapFilterState>(DEFAULT_MAP_FILTERS);
  const [viewedIds, setViewedIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<MapProject | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [paywallMessage, setPaywallMessage] = useState(
    "You've explored 3 projects. Pick a plan to keep going.",
  );

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

  const filtered = useMemo(() => {
    return filterPins(pins, filters).map((p) => ({
      ...p,
      color: pinColorForScorePublic(p.displayScore),
    }));
  }, [pins, filters]);

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
        "circle-color": "#2563EB",
        "circle-radius": ["step", ["get", "point_count"], 16, 25, 22, 100, 28],
        "circle-opacity": 0.92,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
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
      paint: { "text-color": "#ffffff" },
    });
    // Same pin styling language as MapView (halo + fill + score label)
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
        "circle-stroke-color": "#ffffff",
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
        "text-color": "#ffffff",
        "text-halo-color": "rgba(0,0,0,0.25)",
        "text-halo-width": 0.5,
      },
    });
  }, []);

  const fitCity = useCallback((map: MapLibreMap, all: TeaserPin[]) => {
    const cityPins = all.filter((p) => p.city === cityRef.current.id);
    const use = cityPins.length ? cityPins : all;
    if (!use.length) {
      map.flyTo({
        center: cityRef.current.center,
        zoom: cityRef.current.zoom,
        duration: 600,
      });
      return;
    }
    const bounds = new LngLatBounds();
    for (const p of use) bounds.extend([p.longitude, p.latitude]);
    map.fitBounds(bounds, {
      padding: 64,
      maxZoom: 12,
      duration: 700,
      essential: true,
    });
  }, []);

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
        if (!map.getSource("projects")) addLayers(map);
        paintPins(map, filterPins(pinsRef.current, filters).map((p) => ({
          ...p,
          color: pinColorForScorePublic(p.displayScore),
        })));
        if (!fittedRef.current) {
          fitCity(map, pinsRef.current);
          fittedRef.current = true;
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
    // filters captured via pinsRef paint on load; don't re-init on filter change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addLayers, fitCity, mapKey, paintPins]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    paintPins(map, filtered);
    if (!fittedRef.current && pins.length > 0) {
      fitCity(map, pins);
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
        map.easeTo({ center: geom.coordinates, zoom, duration: 400 });
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
    // After the 3rd card is closed, slide up pricing
    if (nextRemaining === 0 && viewedIds.length >= TEASER_FREE_VIEWS) {
      showPaywall();
    }
  }

  return (
    <>
      <section className="relative h-[100dvh] w-full overflow-hidden bg-[#dfe7ef]">
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

        {/* Top: wordmark · pill · auth links */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-6">
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/"
              className="pointer-events-auto shrink-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
              aria-label="Procurity home"
            >
              <Logo variant="dark" size={28} />
            </Link>
            <nav className="pointer-events-auto flex shrink-0 items-center">
              <Link
                href="/pricing"
                className="inline-flex h-11 items-center px-2.5 text-sm font-semibold text-ink underline-offset-4 hover:underline sm:px-3"
              >
                Pricing
              </Link>
              <Link
                href="/login"
                className="inline-flex h-11 items-center px-2.5 text-sm font-semibold text-ink underline-offset-4 hover:underline sm:px-3"
              >
                Log in
              </Link>
            </nav>
          </div>
          <div className="mt-2 flex justify-center">
            <p className="brand-gradient rounded-full px-3 py-2 text-center text-[11px] font-semibold leading-snug text-white shadow-sm sm:text-xs">
              See which new construction projects are ready to buy ·{" "}
              {remaining} free view{remaining === 1 ? "" : "s"} left
            </p>
          </div>
        </div>

        {/* Real map filters — same component & placement language as /app/map */}
        <div className="pointer-events-none absolute inset-x-0 top-[5.5rem] z-20 flex justify-center px-3 md:top-24 md:justify-start md:px-5">
          <div className="pointer-events-auto max-w-full">
            <MapFilters value={filters} onChange={setFilters} />
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-3 left-3 z-20 md:bottom-6 md:left-5">
          <MapPinLegend scoreMode={filters.scoreMode} publicRamp />
        </div>

        {loading && (
          <div className="pointer-events-none absolute inset-x-0 bottom-24 z-10 flex justify-center">
            <span className="rounded-full border border-line bg-white/95 px-4 py-2 text-xs font-bold text-ink shadow-sm">
              Loading projects…
            </span>
          </div>
        )}

        {mapFailed && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#dfe7ef] px-4">
            <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-line bg-white px-5 py-6 text-center shadow-sm">
              <p className="text-sm font-semibold text-ink">
                The map didn&apos;t load. Retry
              </p>
              <button
                type="button"
                onClick={() => {
                  fittedRef.current = false;
                  styleIndexRef.current = 0;
                  setMapFailed(false);
                  setMapKey((k) => k + 1);
                }}
                className="brand-gradient inline-flex h-11 min-w-[120px] items-center justify-center rounded-full px-4 text-sm font-bold text-white"
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

        {/* Pricing slide-up (not full-screen) */}
        <AnimatePresence>
          {paywall && (
            <>
              <motion.button
                type="button"
                aria-label="Dismiss"
                className="absolute inset-0 z-40 bg-ink/45"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setPaywall(false)}
              />
              <motion.div
                role="dialog"
                aria-modal
                className="absolute inset-x-0 bottom-0 z-50 mx-auto max-h-[min(85dvh,720px)] w-full max-w-4xl overflow-y-auto rounded-t-3xl border border-line bg-white p-5 shadow-2xl sm:p-8"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: 36,
                  mass: 0.9,
                }}
              >
                <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line" />
                <h2 className="text-center text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                  {paywallMessage.includes("Start a job") ? (
                    <>
                      Start a job with a{" "}
                      <span className="brand-gradient-text">plan</span>
                    </>
                  ) : (
                    <>
                      You&apos;ve explored 3 projects. Pick a plan to{" "}
                      <span className="brand-gradient-text">keep going</span>.
                    </>
                  )}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-center text-sm text-slate">
                  Your city ({city.shortLabel}) carries into signup and checkout.
                </p>
                <div className="mt-6">
                  <PricingCards ctaHref={signupHref.replace("&checkout=1&tier=growth", "")} />
                </div>
                <p className="mt-6 text-center text-sm">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-bold text-[#2563EB] underline-offset-2 hover:underline"
                  >
                    Log in
                  </Link>
                </p>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </section>
    </>
  );
}

const STEPS = [
  {
    title: "See what's about to be built",
    body: "Open the map and spot new construction that's ready for outreach.",
    Icon: MapPin,
  },
  {
    title: "Know who to contact and why now",
    body: "Buy Score and plain-English reasons show you where to start.",
    Icon: MessageSquare,
  },
  {
    title: "Measure, quote, and get paid in one place",
    body: "Take the job from the map to a deposit without juggling tools.",
    Icon: Wallet,
  },
];

export function HomeBelowFold() {
  return (
    <div className="relative bg-transparent">
      <IphoneAppSection />
      <HomeVideoSection />

      <section className="border-t border-white/40 px-5 py-14 md:px-10 md:py-16">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((s) => (
            <div key={s.title} className="text-center md:text-left">
              <div className="brand-gradient mx-auto flex h-12 w-12 items-center justify-center rounded-full text-white md:mx-0">
                <s.Icon className="h-6 w-6" aria-hidden />
              </div>
              <h2 className="mt-4 text-lg font-bold text-ink">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        id="pricing"
        className="border-t border-white/40 px-5 py-14 md:px-10 md:py-16"
      >
        <div className="mx-auto max-w-6xl rounded-3xl border border-white/60 bg-white/90 p-6 shadow-sm backdrop-blur md:p-10">
          <h2 className="text-center text-2xl font-bold text-ink md:text-3xl">
            Simple pricing
          </h2>
          <p className="mx-auto mt-2 max-w-md text-center text-slate">
            Start with a free trial. Upgrade when your coverage grows.
          </p>
          <div className="mt-8">
            <PricingCards />
          </div>
        </div>
      </section>

      <footer className="border-t border-white/40 px-5 py-8 md:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Logo variant="dark" size={28} />
          <div className="flex flex-wrap gap-4 text-sm font-semibold text-slate">
            <Link href="/how-it-works">How it works</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/login">Log in</Link>
            <Link href="/signup">Create account</Link>
          </div>
          <p className="text-xs text-slate">
            © {new Date().getFullYear()} Procurity · Find your next job.
          </p>
        </div>
      </footer>
    </div>
  );
}
