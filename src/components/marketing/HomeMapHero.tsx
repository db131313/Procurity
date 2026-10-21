"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type MapLayerMouseEvent,
  LngLatBounds,
} from "maplibre-gl";
import { Lock, MapPin, MessageSquare, Wallet, X } from "lucide-react";
import {
  CITY_COOKIE,
  PICKER_CITIES,
  type PickerCity,
} from "@/lib/cities/picker";
import {
  TEASER_FREE_VIEWS,
  TEASER_VIEWS_LOCAL_KEY,
} from "@/lib/teaser/constants";
import { PricingCards } from "./PricingCards";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

/** Primary + fallback tile styles. Never leave a blank gray map. */
const STYLE_PRIMARY =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
  "https://tiles.openfreemap.org/styles/liberty";
const STYLE_FALLBACK = "https://demotiles.maplibre.org/style.json";
const STYLE_LOAD_TIMEOUT_MS = 6000;

const SERVED = PICKER_CITIES.filter((c) => c.served);

type TeaserPin = {
  id: string;
  latitude: number;
  longitude: number;
  score: number;
  label?: string;
  city?: string;
};

type TeaserDetail = {
  id: string;
  address: string;
  projectType: string;
  phaseLabel: string;
  score: number;
  scoreReasons: string[];
  valueLow: number;
  valueHigh: number;
  likelyNeeds: { trade: string; score: number }[];
};

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

function cityById(id: string): PickerCity {
  return SERVED.find((c) => c.id === id) ?? SERVED[0]!;
}

function pinsToGeoJSON(pins: TeaserPin[]) {
  return {
    type: "FeatureCollection" as const,
    features: pins.map((p, i) => ({
      type: "Feature" as const,
      id: i + 1,
      properties: {
        projectId: p.id,
        score: p.score,
        label: p.label || "",
        city: p.city || "",
      },
      geometry: {
        type: "Point" as const,
        coordinates: [p.longitude, p.latitude] as [number, number],
      },
    })),
  };
}

function fitCityPins(map: MapLibreMap, pins: TeaserPin[], city: PickerCity) {
  const cityPins = pins.filter((p) => p.city === city.id);
  const use = cityPins.length > 0 ? cityPins : pins;
  if (use.length === 0) {
    map.flyTo({
      center: city.center,
      zoom: city.zoom,
      duration: 600,
      essential: true,
    });
    return;
  }
  const bounds = new LngLatBounds();
  for (const p of use) bounds.extend([p.longitude, p.latitude]);
  map.fitBounds(bounds, {
    padding: 56,
    maxZoom: 12,
    duration: 700,
    essential: true,
  });
}

function addPinLayers(map: MapLibreMap) {
  if (map.getSource("teaser-pins")) return;

  map.addSource("teaser-pins", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
    cluster: true,
    clusterMaxZoom: 11,
    clusterRadius: 52,
  });

  map.addLayer({
    id: "teaser-clusters",
    type: "circle",
    source: "teaser-pins",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": "#2563EB",
      "circle-radius": [
        "step",
        ["get", "point_count"],
        16,
        25,
        20,
        100,
        26,
      ],
      "circle-opacity": 0.9,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
    },
  });

  map.addLayer({
    id: "teaser-cluster-count",
    type: "symbol",
    source: "teaser-pins",
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-size": 12,
    },
    paint: {
      "text-color": "#ffffff",
    },
  });

  // Blue ramp: light = lower score, dark = higher
  map.addLayer({
    id: "teaser-pins-halo",
    type: "circle",
    source: "teaser-pins",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-radius": 12,
      "circle-color": [
        "interpolate",
        ["linear"],
        ["get", "score"],
        40,
        "#93C5FD",
        70,
        "#3B82F6",
        100,
        "#1E3A8A",
      ],
      "circle-opacity": 0.28,
    },
  });

  map.addLayer({
    id: "teaser-pins",
    type: "circle",
    source: "teaser-pins",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["get", "score"],
        40,
        6,
        100,
        9,
      ],
      "circle-color": [
        "interpolate",
        ["linear"],
        ["get", "score"],
        40,
        "#93C5FD",
        55,
        "#60A5FA",
        70,
        "#2563EB",
        85,
        "#1D4ED8",
        100,
        "#1E3A8A",
      ],
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
    },
  });
}

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

  const [ready, setReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const [pins, setPins] = useState<TeaserPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinsError, setPinsError] = useState<string | null>(null);
  const [viewedIds, setViewedIds] = useState<string[]>([]);
  const [detail, setDetail] = useState<TeaserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [paywall, setPaywall] = useState(false);

  const city = cityRef.current;
  const remaining = Math.max(0, TEASER_FREE_VIEWS - viewedIds.length);
  const signupHref = `/signup?city=${encodeURIComponent(city.id)}&checkout=1&tier=growth`;

  useEffect(() => {
    setViewedIds(readLocalViews());
    setCityCookie(initialCityId);
  }, [initialCityId]);

  const loadPins = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setPinsError(null);
    try {
      const res = await fetch("/api/teaser/pins/all", {
        signal,
        cache: "default",
      });
      if (!res.ok) {
        setPinsError("We couldn't load projects. Try again.");
        return;
      }
      const data = (await res.json()) as {
        ok?: boolean;
        pins?: TeaserPin[];
      };
      const next = Array.isArray(data.pins) ? data.pins : [];
      pinsRef.current = next;
      setPins(next);
      if (!next.length) {
        setPinsError("No projects to show yet. Try again shortly.");
      }
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") return;
      setPinsError("We couldn't load projects. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void loadPins(ac.signal);
    return () => ac.abort();
  }, [loadPins]);

  const paintPins = useCallback((map: MapLibreMap, next: TeaserPin[]) => {
    const source = map.getSource("teaser-pins") as GeoJSONSource | undefined;
    if (!source) return;
    source.setData(pinsToGeoJSON(next));
  }, []);

  const attachStyleHandlers = useCallback(
    (map: MapLibreMap, cancelled: () => boolean) => {
      const clearTimer = () => {
        if (loadTimerRef.current) {
          clearTimeout(loadTimerRef.current);
          loadTimerRef.current = null;
        }
      };

      const tryFallbackOrFail = () => {
        if (cancelled()) return;
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
          if (cancelled() || map.loaded()) return;
          tryFallbackOrFail();
        }, STYLE_LOAD_TIMEOUT_MS);
      };

      const onLoad = () => {
        if (cancelled()) return;
        clearTimer();
        setMapFailed(false);
        try {
          // setStyle wipes sources — always (re)add after every load
          if (!map.getSource("teaser-pins")) addPinLayers(map);
          paintPins(map, pinsRef.current);
          if (!fittedRef.current) {
            fitCityPins(map, pinsRef.current, cityRef.current);
            fittedRef.current = true;
          }
          map.resize();
          setReady(true);
        } catch (err) {
          console.error("[HomeMapHero] pin layers failed", err);
          tryFallbackOrFail();
        }
      };

      map.on("load", onLoad);
      map.on("error", (e) => {
        const err = (e as unknown as { error?: { message?: string } }).error;
        const msg = String(err?.message || e);
        // Ignore routine tile 404s; react to style failures
        if (/style|Failed to fetch|AJAXError|network/i.test(msg)) {
          tryFallbackOrFail();
        }
      });
      armTimer();

      return () => {
        clearTimer();
        map.off("load", onLoad);
      };
    },
    [paintPins],
  );

  // Init map. Wrapper keeps size; map container uses h-full so MapLibre's
  // `.maplibregl-map { position: relative }` cannot collapse height to 0.
  useEffect(() => {
    const el = containerRef.current;
    const wrap = wrapperRef.current;
    if (!el || !wrap) return;

    let cancelled = false;
    let map: MapLibreMap | null = null;
    let detachStyle: (() => void) | undefined;
    let ro: ResizeObserver | null = null;
    let raf = 0;

    const isCancelled = () => cancelled;

    const init = () => {
      if (cancelled || !containerRef.current || !wrapperRef.current) return;
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
      // E2E / debug handle — cleared on unmount
      (window as unknown as { __pcHomeMap?: MapLibreMap }).__pcHomeMap = map;
      detachStyle = attachStyleHandlers(map, isCancelled);

      map.on("mouseenter", "teaser-pins", () => {
        map!.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "teaser-pins", () => {
        map!.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "teaser-clusters", () => {
        map!.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "teaser-clusters", () => {
        map!.getCanvas().style.cursor = "";
      });

      ro = new ResizeObserver(() => {
        map?.resize();
      });
      ro.observe(wrapperRef.current);
    };

    raf = requestAnimationFrame(init);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      detachStyle?.();
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
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
  }, [attachStyleHandlers, mapKey]);

  // Push pins as soon as both map + data are ready (<2s target after load)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    paintPins(map, pins);
    if (!fittedRef.current && pins.length > 0) {
      fitCityPins(map, pins, cityRef.current);
      fittedRef.current = true;
    }
  }, [pins, ready, paintPins]);

  const openDetail = useCallback(
    async (projectId: string) => {
      if (paywall) return;
      setDetailLoading(true);
      try {
        const res = await fetch(
          `/api/teaser/detail?id=${encodeURIComponent(projectId)}`,
          { cache: "no-store" },
        );
        if (res.status === 402) {
          setPaywall(true);
          setDetail(null);
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as {
          ok?: boolean;
          detail?: TeaserDetail;
        };
        if (!data.ok || !data.detail) return;

        const nextIds = [...new Set([...readLocalViews(), projectId])].slice(
          0,
          TEASER_FREE_VIEWS,
        );
        writeLocalViews(nextIds);
        setViewedIds(nextIds);
        setDetail(data.detail);
      } finally {
        setDetailLoading(false);
      }
    },
    [paywall],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const onPinClick = (e: MapLayerMouseEvent) => {
      if (paywall) return;
      const id = e.features?.[0]?.properties?.projectId as string | undefined;
      if (!id) return;
      void openDetail(id);
    };

    const onClusterClick = async (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const clusterId = feature.properties?.cluster_id as number | undefined;
      if (clusterId == null) return;
      const source = map.getSource("teaser-pins") as GeoJSONSource;
      try {
        const zoom = await source.getClusterExpansionZoom(clusterId);
        const geom = feature.geometry as {
          type: string;
          coordinates: [number, number];
        };
        map.easeTo({ center: geom.coordinates, zoom, duration: 400 });
      } catch {
        // ignore
      }
    };

    map.on("click", "teaser-pins", onPinClick);
    map.on("click", "teaser-clusters", onClusterClick);
    return () => {
      map.off("click", "teaser-pins", onPinClick);
      map.off("click", "teaser-clusters", onClusterClick);
    };
  }, [ready, openDetail, paywall]);

  function retryMap() {
    fittedRef.current = false;
    styleIndexRef.current = 0;
    setMapFailed(false);
    setMapKey((k) => k + 1);
  }

  return (
    <>
      <section className="relative h-[100dvh] w-full overflow-hidden bg-[#dfe7ef]">
        {/*
          CRITICAL: MapLibre adds `.maplibregl-map { position: relative }` to the
          container element, which overrides Tailwind `absolute` and collapses
          height to 0 (blank gray hero). Keep sizing on an outer wrapper;
          give the MapLibre container `h-full w-full` only.
        */}
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
            aria-label="Map of new construction projects across served cities"
          />
        </div>

        {/* Top bar + one-line pill — nothing else on the map */}
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
                className="inline-flex h-11 items-center px-2.5 text-sm font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] sm:px-3"
              >
                Pricing
              </Link>
              <Link
                href="/login"
                className="inline-flex h-11 items-center px-2.5 text-sm font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] sm:px-3"
              >
                Log in
              </Link>
            </nav>
          </div>
          <div className="mt-2 flex justify-center">
            <p className="rounded-full border border-line bg-white/95 px-3 py-2 text-center text-[11px] font-semibold leading-snug text-ink shadow-sm backdrop-blur sm:text-xs">
              See which new construction projects are ready to buy ·{" "}
              {remaining} free view{remaining === 1 ? "" : "s"} left
            </p>
          </div>
        </div>

        {mapFailed && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#dfe7ef] px-4">
            <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-line bg-white px-5 py-6 text-center shadow-sm">
              <p className="text-sm font-semibold text-ink">
                The map didn&apos;t load. Retry
              </p>
              <button
                type="button"
                onClick={retryMap}
                className="inline-flex h-11 min-w-[120px] items-center justify-center rounded-full bg-[#2563EB] px-4 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {loading && !mapFailed && (
          <div className="pointer-events-none absolute inset-x-0 bottom-24 z-10 flex justify-center md:bottom-8">
            <span className="rounded-full border border-line bg-white/95 px-4 py-2 text-xs font-bold text-ink shadow-sm">
              Loading projects…
            </span>
          </div>
        )}

        {!loading && pinsError && !mapFailed && (
          <div className="absolute inset-x-0 bottom-24 z-10 flex justify-center px-4 md:bottom-8">
            <div className="flex max-w-sm flex-col items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-center shadow-sm">
              <p className="text-sm text-ink">{pinsError}</p>
              <button
                type="button"
                onClick={() => void loadPins()}
                className="inline-flex h-11 min-w-[120px] items-center justify-center rounded-full bg-[#2563EB] px-4 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {(detail || detailLoading) && !paywall && (
          <>
            <button
              type="button"
              aria-label="Close project details"
              className="fixed inset-0 z-30 bg-ink/30 md:bg-transparent"
              onClick={() => setDetail(null)}
            />
            <aside
              role="dialog"
              aria-modal
              aria-label="Project details"
              className={cn(
                "fixed z-40 flex flex-col bg-white shadow-lg",
                "inset-x-0 bottom-0 max-h-[min(70dvh,560px)] rounded-t-3xl",
                "md:inset-y-0 md:right-0 md:left-auto md:w-[380px] md:max-h-none md:rounded-none md:border-l md:border-line",
              )}
            >
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-[#2563EB]">
                  Project
                </p>
                <button
                  type="button"
                  onClick={() => setDetail(null)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate hover:bg-offwhite focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563EB]"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {detailLoading && !detail && (
                  <p className="text-sm font-semibold text-slate">Loading…</p>
                )}
                {detail && (
                  <>
                    <h2 className="text-lg font-bold leading-snug text-ink">
                      {detail.address}
                    </h2>
                    <p className="mt-1 text-sm text-slate">
                      {detail.projectType} · {detail.phaseLabel}
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2563EB] text-lg font-bold text-white">
                        {detail.score}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-ink">Buy Score</p>
                        {(detail.valueLow > 0 || detail.valueHigh > 0) && (
                          <p className="text-sm text-slate">
                            Est. ${detail.valueLow.toLocaleString()}–$
                            {detail.valueHigh.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <ul className="mt-4 space-y-1.5">
                      {detail.scoreReasons.map((r) => (
                        <li key={r} className="text-sm leading-snug text-slate">
                          · {r}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-5">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate">
                        Likely needs
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {detail.likelyNeeds.map((t) => (
                          <span
                            key={t.trade}
                            className="rounded-full border border-line bg-offwhite px-2.5 py-1 text-xs font-bold text-ink"
                          >
                            {t.trade}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-line bg-offwhite p-3">
                      <Lock
                        className="mt-0.5 h-5 w-5 shrink-0 text-[#2563EB]"
                        aria-hidden
                      />
                      <div>
                        <p className="text-sm font-bold text-ink">
                          Contact details unlock with a plan
                        </p>
                        <p className="mt-0.5 text-xs text-slate">
                          Owner, GC, architect, and phone stay private until you
                          subscribe.
                        </p>
                        <Link
                          href={signupHref}
                          className="mt-3 inline-flex h-11 items-center justify-center rounded-full bg-[#2563EB] px-4 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
                        >
                          Unlock contacts
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </aside>
          </>
        )}

        {paywall && (
          <div className="absolute inset-0 z-50 flex items-end justify-center overflow-y-auto bg-ink/50 px-4 py-8 sm:items-center">
            <div className="w-full max-w-4xl rounded-3xl border border-line bg-white p-5 shadow-lg sm:p-8">
              <h2 className="text-center text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                You&apos;ve seen 3 projects. Pick a plan to keep going.
              </h2>
              <p className="mx-auto mt-2 max-w-md text-center text-sm text-slate">
                Your city ({city.shortLabel}) carries into signup and checkout.
              </p>
              <div className="mt-8">
                <PricingCards
                  ctaHref={`/signup?city=${encodeURIComponent(city.id)}`}
                />
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
            </div>
          </div>
        )}
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
    <div className="bg-white">
      <section className="border-t border-line px-5 py-14 md:px-10 md:py-16">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((s) => (
            <div key={s.title} className="text-center md:text-left">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#2563EB]/10 text-[#2563EB] md:mx-0">
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
        className="border-t border-line bg-offwhite px-5 py-14 md:px-10 md:py-16"
      >
        <div className="mx-auto max-w-6xl">
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

      <footer className="border-t border-line px-5 py-8 md:px-10">
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
