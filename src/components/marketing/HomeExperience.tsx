"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { HomeSwarmMap } from "./HomeSwarmMap";
import { HomeMapHero } from "./HomeMapHero";
import { FeatureCarousel } from "./FeatureCarousel";
import { HomeBelowBw } from "./HomeBelowBw";
import { cn } from "@/lib/cn";
import { SLIDES } from "@/content/carousel";

type Props = {
  initialCityId: string;
};

/**
 * Public home: black/white swarm hero → feature carousel → steps / pricing.
 * First paint is nav + ThinkingBlob only; copy/CTAs fade in at progress=1.
 */
export function HomeExperience({ initialCityId }: Props) {
  const [mapOpen, setMapOpen] = useState(false);
  const [mapCityId, setMapCityId] = useState(initialCityId);
  const [focusProjectId, setFocusProjectId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const openMap = useCallback(
    (opts?: { cityId?: string; projectId?: string }) => {
      if (opts?.cityId) setMapCityId(opts.cityId);
      setFocusProjectId(opts?.projectId ?? null);
      setMapOpen(true);
    },
    [],
  );

  const closeMap = useCallback(() => {
    setMapOpen(false);
    setFocusProjectId(null);
  }, []);

  const onProgress = useCallback((p: number) => {
    if (p >= 1) setReady(true);
  }, []);

  return (
    <div className="marketing-bw min-h-dvh bg-[var(--night,#0B0D0E)] text-white">
      {/* First-slide poster preload for LCP */}
      <link rel="preload" as="image" href={SLIDES[0]!.video.poster} />

      {!mapOpen && (
        <>
          <section
            className="relative flex flex-col"
            style={{ height: "max(640px, calc(100svh - 96px))" }}
            data-testid="home-hero-bw"
          >
            <header
              className="absolute inset-x-0 top-0 z-40"
              style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
            >
              <div className="flex h-14 items-center justify-between px-5 md:h-16 md:px-8">
                <Link
                  href="/"
                  className="text-base font-semibold tracking-tight text-white"
                  aria-label="Procurity home"
                >
                  Procurity
                </Link>
                <nav className="flex items-center gap-1 sm:gap-3">
                  <Link
                    href="#how-it-works"
                    className="hidden px-2 text-sm text-neutral-300 hover:text-white sm:inline"
                  >
                    How it works
                  </Link>
                  <Link
                    href="#pricing"
                    className="px-2 text-sm text-neutral-300 hover:text-white"
                  >
                    Pricing
                  </Link>
                  <Link
                    href="/login"
                    className="px-2 text-sm text-neutral-300 hover:text-white"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="bw-btn-primary pc-press ml-1 h-9 px-4 text-sm"
                  >
                    Start free
                  </Link>
                </nav>
              </div>
            </header>

            <div className="relative flex min-h-0 flex-1 flex-col pt-[calc(3.5rem+env(safe-area-inset-top,0px))] md:pt-[calc(4rem+env(safe-area-inset-top,0px))]">
              <div
                className={cn(
                  "relative z-20 mx-auto flex w-full max-w-3xl flex-col items-center px-5 pt-6 text-center transition-opacity duration-500 md:pt-8",
                  ready ? "opacity-100" : "pointer-events-none opacity-0",
                )}
                data-testid="home-hero-copy"
                aria-hidden={!ready}
              >
                <h1 className="text-[1.65rem] font-semibold leading-[1.15] tracking-tight text-white sm:text-4xl md:text-[2.75rem]">
                  Every commercial build, scored by how soon it will buy.
                </h1>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/signup"
                    className="bw-btn-primary pc-press h-11 px-6 text-sm"
                  >
                    Start free
                  </Link>
                  <button
                    type="button"
                    onClick={() => openMap()}
                    className="bw-btn-ghost pc-press h-11 px-6 text-sm"
                    data-testid="explore-map"
                  >
                    Explore the map
                  </button>
                </div>
              </div>

              <div className="relative mt-2 min-h-0 w-full flex-1">
                <HomeSwarmMap
                  onExplore={openMap}
                  onProgress={onProgress}
                  className="absolute inset-0"
                />
              </div>
            </div>
          </section>

          <FeatureCarousel />
          <HomeBelowBw />
        </>
      )}

      {mapOpen && (
        <div
          className={cn("fixed inset-0 z-50 bg-black")}
          data-testid="home-map-panel"
        >
          <HomeMapHero
            initialCityId={mapCityId}
            panel
            onBack={closeMap}
            focusProjectId={focusProjectId}
          />
        </div>
      )}
    </div>
  );
}
