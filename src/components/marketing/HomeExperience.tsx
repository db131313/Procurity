"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HomeSwarmMap } from "./HomeSwarmMap";
import { HomeMapHero } from "./HomeMapHero";
import { FeatureCarousel } from "./FeatureCarousel";
import { HomeBelowBw } from "./HomeBelowBw";
import { cn } from "@/lib/cn";
import { SLIDES } from "@/content/carousel";
import shell from "./HomeShell.module.css";

type Props = {
  initialCityId: string;
};

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Public home:
 * 1. Fixed header (+ mobile hamburger)
 * 2. Intro blob → FeatureCarousel as full-viewport hero
 * 3. Swarm map section
 * 4. Steps / pricing
 */
export function HomeExperience({ initialCityId }: Props) {
  const [mapOpen, setMapOpen] = useState(false);
  const [mapCityId, setMapCityId] = useState(initialCityId);
  const [focusProjectId, setFocusProjectId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const [mapLoad, setMapLoad] = useState(false);
  const firstVideoRef = useRef<HTMLVideoElement | null>(null);

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

  const setMenu = useCallback((open: boolean) => {
    setMenuOpen(open);
    if (typeof document !== "undefined") {
      document.body.style.overflow = open ? "hidden" : "";
    }
  }, []);

  // Start map fetch as soon as intro begins
  useEffect(() => {
    setMapLoad(true);
  }, []);

  // Intro: blob grows ≥3s (or 300ms if reduced-motion), wait up to +2s for video
  useEffect(() => {
    const t0 = performance.now();
    const rm = prefersReducedMotion();
    let done = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function finish() {
      if (done) return;
      done = true;
      setIntroDone(true);
      setReady(true);
      document.dispatchEvent(new Event("intro-done"));
    }

    function tryFinish() {
      const elapsed = performance.now() - t0;
      const v = firstVideoRef.current;
      const videoReady = !v || v.readyState >= 3 || v.currentTime > 0;
      const min = rm ? 300 : 3000;
      if (elapsed >= min && (videoReady || elapsed > 5000)) {
        finish();
      } else {
        timer = setTimeout(tryFinish, 100);
      }
    }

    tryFinish();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Header glass after 40px scroll
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Esc + resize close menu
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(false);
    };
    const mq = window.matchMedia("(min-width:821px)");
    const onMq = (e: MediaQueryListEvent) => {
      if (e.matches) setMenu(false);
    };
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    return () => {
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
    };
  }, [setMenu]);

  return (
    <div
      className={cn(
        "marketing-bw min-h-dvh bg-[var(--night,#0B0D0E)] text-white",
        ready && shell.ready,
      )}
      data-testid="home-shell"
    >
      <link rel="preload" as="image" href={SLIDES[0]!.video.poster} />

      {!mapOpen && (
        <>
          <header
            className={cn(shell.sh, solid && shell.shSolid)}
            id="sh"
            data-testid="home-header"
          >
            <Link href="/" className={shell.logo} aria-label="Procurity home">
              Procurity
            </Link>
            <nav className={shell.dl} data-testid="home-desktop-nav">
              <Link href="#how-it-works">How it works</Link>
              <Link href="#pricing">Pricing</Link>
              <Link href="/login">Log in</Link>
              <Link
                href="/signup"
                className="bw-btn-primary pc-press h-9 px-4 text-sm"
              >
                Start free
              </Link>
            </nav>
            <button
              type="button"
              className={cn(shell.burger, menuOpen && shell.burgerOpen)}
              id="burger"
              data-testid="home-burger"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="menu"
              onClick={() => setMenu(!menuOpen)}
            >
              <i />
              <i />
            </button>
          </header>

          <div
            className={cn(shell.menu, menuOpen && shell.menuOpen)}
            id="menu"
            data-testid="home-menu"
            aria-hidden={!menuOpen}
            inert={!menuOpen ? true : undefined}
          >
            <div className={shell.ml2}>
              <Link href="#how-it-works" onClick={() => setMenu(false)}>
                How it works
              </Link>
              <Link href="#pricing" onClick={() => setMenu(false)}>
                Pricing
              </Link>
              <Link href="/login" onClick={() => setMenu(false)}>
                Log in
              </Link>
            </div>
            <Link
              href="/signup"
              className={cn("bw-btn-primary pc-press", shell.mcta)}
              onClick={() => setMenu(false)}
            >
              Start free
            </Link>
          </div>

          <div
            className={cn(shell.intro, introDone && shell.introDone)}
            id="intro"
            role="status"
            aria-label="Loading"
            data-testid="home-intro"
          >
            <div className={shell.bl} aria-hidden>
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>

          <FeatureCarousel ready={ready} firstVideoRef={firstVideoRef} />

          <section
            className={cn(shell.swarm, "relative")}
            data-testid="home-swarm-section"
            id="map"
          >
            <div className="mx-auto flex max-w-3xl flex-col items-center px-5 pb-4 pt-16 text-center md:pt-20">
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
            <div className="relative h-[min(70vh,640px)] min-h-[360px] w-full md:h-[min(75vh,720px)]">
              {mapLoad ? (
                <HomeSwarmMap
                  onExplore={openMap}
                  className="absolute inset-0"
                />
              ) : null}
            </div>
          </section>

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
