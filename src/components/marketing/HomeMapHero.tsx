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

const STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
  "https://tiles.openfreemap.org/styles/liberty";

const SERVED = PICKER_CITIES.filter((c) => c.served);

type TeaserPin = {
  id: string;
  latitude: number;
  longitude: number;
  score: number;
  label?: string;
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

type Props = {
  initialCityId: string;
};

export function HomeMapHero({ initialCityId }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const requestGen = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const pinsRef = useRef<TeaserPin[]>([]);

  const [ready, setReady] = useState(false);
  const [cityId, setCityId] = useState(initialCityId);
  const [pins, setPins] = useState<TeaserPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewedIds, setViewedIds] = useState<string[]>([]);
  const [detail, setDetail] = useState<TeaserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [paywall, setPaywall] = useState(false);

  const city: PickerCity =
    SERVED.find((c) => c.id === cityId) ?? SERVED[0]!;
  const remaining = Math.max(0, TEASER_FREE_VIEWS - viewedIds.length);

  useEffect(() => {
    setViewedIds(readLocalViews());
  }, []);

  const loadPins = useCallback(async (id: string) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const gen = ++requestGen.current;

    setLoading(true);
    setError(null);
    setPins([]);
    pinsRef.current = [];
    setDetail(null);

    try {
      const res = await fetch(`/api/teaser/pins/${encodeURIComponent(id)}`, {
        signal: ac.signal,
        cache: "no-store",
      });
      if (gen !== requestGen.current) return;
      if (!res.ok) {
        setError("We couldn't load projects for this city. Try again.");
        return;
      }
      const data = (await res.json()) as {
        ok?: boolean;
        city?: string;
        pins?: TeaserPin[];
      };
      if (gen !== requestGen.current) return;
      if (data.city && data.city !== id) {
        setError("That city's map didn't load correctly. Try again.");
        return;
      }
      const next = Array.isArray(data.pins) ? data.pins : [];
      pinsRef.current = next;
      setPins(next);
      if (!next.length) {
        setError("No projects to show here yet. Try another city.");
      }
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") return;
      if (gen !== requestGen.current) return;
      setError("We couldn't load projects for this city. Try again.");
    } finally {
      if (gen === requestGen.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPins(cityId);
    setCityCookie(cityId);
    return () => abortRef.current?.abort();
  }, [cityId, loadPins]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;
    let map: MapLibreMap | null = null;

    const init = () => {
      if (cancelled || !containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      if (width < 2 || height < 2) {
        requestAnimationFrame(init);
        return;
      }

      map = new MapLibreMap({
        container: containerRef.current,
        style: STYLE_URL,
        center: city.center,
        zoom: city.zoom,
        maxPitch: 45,
        attributionControl: {},
      });
      map.addControl(
        new NavigationControl({ visualizePitch: false }),
        "bottom-right",
      );
      mapRef.current = map;

      map.on("load", () => {
        if (cancelled || !map) return;
        map.addSource("teaser-pins", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        // Blue ramp: light = lower score, dark = higher
        map.addLayer({
          id: "teaser-pins-halo",
          type: "circle",
          source: "teaser-pins",
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
        map.on("mouseenter", "teaser-pins", () => {
          map!.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "teaser-pins", () => {
          map!.getCanvas().style.cursor = "";
        });
        setReady(true);
      });
    };

    const raf = requestAnimationFrame(init);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      map?.remove();
      mapRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource("teaser-pins") as GeoJSONSource | undefined;
    if (!source) return;

    source.setData({
      type: "FeatureCollection",
      features: pins.map((p, i) => ({
        type: "Feature",
        id: i + 1,
        properties: {
          projectId: p.id,
          score: p.score,
          label: p.label || "",
        },
        geometry: {
          type: "Point",
          coordinates: [p.longitude, p.latitude],
        },
      })),
    });

    if (pins.length > 0) {
      const bounds = new LngLatBounds();
      for (const p of pins) bounds.extend([p.longitude, p.latitude]);
      map.fitBounds(bounds, {
        padding: 64,
        maxZoom: 13,
        duration: 800,
        essential: true,
      });
    } else {
      map.flyTo({
        center: city.center,
        zoom: city.zoom,
        duration: 800,
        essential: true,
      });
    }
  }, [pins, ready, city]);

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
          viewedCount?: number;
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

    const onClick = (e: MapLayerMouseEvent) => {
      if (paywall) return;
      const id = e.features?.[0]?.properties?.projectId as string | undefined;
      if (!id) return;
      void openDetail(id);
    };
    map.on("click", "teaser-pins", onClick);
    return () => {
      map.off("click", "teaser-pins", onClick);
    };
  }, [ready, openDetail, paywall]);

  function selectCity(id: string) {
    if (id === cityId) {
      void loadPins(id);
      return;
    }
    setCityId(id);
  }

  const signupHref = `/signup?city=${encodeURIComponent(cityId)}&checkout=1&tier=growth`;

  return (
    <>
      {/* Full-viewport map */}
      <section className="relative h-[100dvh] w-full overflow-hidden bg-[#dfe7ef]">
        <div
          ref={containerRef}
          className={cn(
            "absolute inset-0",
            paywall && "pointer-events-none brightness-[0.55]",
          )}
          role="application"
          aria-label={`Map of projects in ${city.label}`}
        />

        {/* Top bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-6">
          <Link
            href="/"
            className="pointer-events-auto rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
            aria-label="Procurity home"
          >
            <Logo variant="dark" size={28} />
          </Link>
          <nav className="pointer-events-auto flex items-center gap-1">
            <Link
              href="/pricing"
              className="inline-flex h-11 items-center px-3 text-sm font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="inline-flex h-11 items-center px-3 text-sm font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
            >
              Log in
            </Link>
          </nav>
        </div>

        {/* Floating intro + city picker */}
        <div className="pointer-events-none absolute inset-x-0 top-14 z-20 flex justify-center px-3 md:top-16">
          <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-line bg-white/95 p-3 shadow-sm backdrop-blur md:max-w-lg md:p-4">
            <p className="text-center text-sm font-semibold text-ink md:text-[15px]">
              See which new construction projects are ready to buy.
            </p>
            <label className="mt-3 block">
              <span className="sr-only">City</span>
              <select
                value={cityId}
                onChange={(e) => selectCity(e.target.value)}
                className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm font-bold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
              >
                {SERVED.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-2 flex justify-center">
              <span className="inline-flex h-9 items-center rounded-full border border-line bg-offwhite px-3 text-xs font-bold text-slate">
                {remaining} free project view{remaining === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>

        {loading && (
          <div className="pointer-events-none absolute inset-x-0 bottom-24 z-10 flex justify-center md:bottom-8">
            <span className="rounded-full border border-line bg-white/95 px-4 py-2 text-xs font-bold text-ink shadow-sm">
              Loading {city.shortLabel} projects…
            </span>
          </div>
        )}

        {!loading && error && (
          <div className="absolute inset-x-0 bottom-24 z-10 flex justify-center px-4 md:bottom-8">
            <div className="flex max-w-sm flex-col items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-center shadow-sm">
              <p className="text-sm text-ink">{error}</p>
              <button
                type="button"
                onClick={() => void loadPins(cityId)}
                className="inline-flex h-11 min-w-[120px] items-center justify-center rounded-full bg-[#2563EB] px-4 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Detail panel */}
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
                // Mobile: bottom sheet
                "inset-x-0 bottom-0 max-h-[min(70dvh,560px)] rounded-t-3xl",
                // Desktop: right panel
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

        {/* Paywall */}
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
                <PricingCards ctaHref={`/signup?city=${encodeURIComponent(cityId)}`} />
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
            <Link href="/signup">Sign up</Link>
          </div>
          <p className="text-xs text-slate">
            © {new Date().getFullYear()} Procurity · Find your next job.
          </p>
        </div>
      </footer>
    </div>
  );
}
