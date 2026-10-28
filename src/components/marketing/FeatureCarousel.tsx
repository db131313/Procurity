"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import Link from "next/link";
import { SLIDES, uniqueVideos } from "@/content/carousel";
import { PhoneScreen } from "./phone-screens";
import { cn } from "@/lib/cn";
import styles from "./FeatureCarousel.module.css";

const INT = 7000;
const N = SLIDES.length;

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type Props = {
  ready: boolean;
  firstVideoRef?: RefObject<HTMLVideoElement | null>;
};

/**
 * Full-bleed carousel hero: centered phone + caption pill (no slide headlines).
 * Phone screens are CSS-animated 7s timelines restarted via `.scPlay`.
 */
export function FeatureCarousel({ ready, firstVideoRef }: Props) {
  const carRef = useRef<HTMLElement | null>(null);
  const videoByKey = useRef<Map<string, HTMLVideoElement>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchX0 = useRef<number | null>(null);
  const [cur, setCur] = useState(0);
  const [vis, setVis] = useState(true);
  const [reduced, setReduced] = useState(true);
  const [tabKey, setTabKey] = useState(0);
  const [playKey, setPlayKey] = useState(0);
  const [capText, setCapText] = useState(SLIDES[0]!.caption);
  const [capOpacity, setCapOpacity] = useState(1);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const iosUrl = process.env.NEXT_PUBLIC_IOS_APP_URL?.trim() || "";

  const videos = useMemo(() => uniqueVideos(SLIDES), []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const arm = useCallback(() => {
    clearTimer();
    if (!reduced && vis && ready) {
      timerRef.current = setTimeout(() => {
        setCur((c) => (c + 1) % N);
        setTabKey((k) => k + 1);
      }, INT);
    }
  }, [clearTimer, reduced, vis, ready]);

  const go = useCallback((i: number) => {
    const next = ((i % N) + N) % N;
    setCur(next);
    setTabKey((k) => k + 1);
  }, []);

  useEffect(() => {
    setReduced(prefersReducedMotion());
  }, []);

  useEffect(() => {
    const el = carRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => setVis(!!entries[0]?.isIntersecting),
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Caption crossfade + restart phone timeline when slide changes
  useEffect(() => {
    setCapOpacity(0);
    const t = setTimeout(() => {
      setCapText(SLIDES[cur]!.caption);
      setCapOpacity(1);
    }, 160);
    setPlayKey((k) => k + 1);
    return () => clearTimeout(t);
  }, [cur]);

  // Play / pause / prefetch
  useEffect(() => {
    const slide = SLIDES[cur]!;
    const key = slide.video.mp4;

    for (const [k, v] of videoByKey.current) {
      const on = k === key;
      v.classList.toggle(styles.bgvOn, on);
      if (on) {
        v.preload = "auto";
        if (vis && !reduced) void v.play().catch(() => {});
      } else {
        v.pause();
      }
    }

    const nextSlide = SLIDES[(cur + 1) % N]!;
    if (nextSlide.video.mp4 !== key) {
      const nx = videoByKey.current.get(nextSlide.video.mp4);
      if (nx) nx.preload = "auto";
    }

    if (vis && ready) arm();
    else clearTimer();
    return () => clearTimer();
  }, [cur, vis, ready, reduced, arm, clearTimer]);

  // intro-done: restart tab progress + phone timeline + arm
  useEffect(() => {
    if (!ready) return;
    setTabKey((k) => k + 1);
    setPlayKey((k) => k + 1);
    arm();
  }, [ready, arm]);

  const tryPlay = useCallback(() => {
    if (reduced) return;
    const key = SLIDES[cur]!.video.mp4;
    void videoByKey.current.get(key)?.play().catch(() => {});
  }, [cur, reduced]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(cur + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(cur - 1);
    }
  };

  const measurePoster =
    SLIDES.find((s) => s.screen === "measure")?.video.poster ??
    SLIDES[0]!.video.poster;
  const activePoster = SLIDES[cur]!.video.poster;
  const activeKey = SLIDES[cur]!.video.mp4;

  return (
    <section
      ref={carRef}
      className={cn(styles.car, (!vis || !ready) && styles.paused)}
      id="car"
      aria-roledescription="carousel"
      aria-label="App walkthrough"
      data-testid="feature-carousel"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={tryPlay}
      onTouchStart={(e) => {
        touchX0.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchX0.current == null) return;
        const x = e.changedTouches[0]?.clientX;
        if (x == null) return;
        const d = x - touchX0.current;
        if (Math.abs(d) > 50) go(cur + (d < 0 ? 1 : -1));
        touchX0.current = null;
      }}
    >
      <div className={styles.bgs} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.poster}
          src={activePoster}
          alt=""
          style={{
            opacity: playingKey === activeKey ? 0 : 1,
            transition: "opacity .7s",
          }}
          fetchPriority="high"
        />
        {videos.map((vid, i) => (
          <video
            key={vid.mp4}
            ref={(el) => {
              if (el) {
                videoByKey.current.set(vid.mp4, el);
                if (i === 0 && firstVideoRef) {
                  (
                    firstVideoRef as { current: HTMLVideoElement | null }
                  ).current = el;
                }
              }
            }}
            className={cn(
              styles.bgv,
              SLIDES[cur]!.video.mp4 === vid.mp4 && styles.bgvOn,
            )}
            muted
            loop
            playsInline
            preload={i === 0 ? "auto" : "metadata"}
            poster={vid.poster}
            onPlaying={() => setPlayingKey(vid.mp4)}
          >
            {vid.webm640 ? (
              <source
                src={vid.webm640}
                type="video/webm"
                media="(max-width:820px)"
              />
            ) : null}
            {vid.mp4640 ? (
              <source
                src={vid.mp4640}
                type="video/mp4"
                media="(max-width:820px)"
              />
            ) : null}
            <source src={vid.webm} type="video/webm" />
            <source src={vid.mp4} type="video/mp4" />
          </video>
        ))}
      </div>

      <div
        className={cn(styles.phs, styles.reveal, ready && styles.revealOn)}
        aria-hidden={false}
      >
        <div className={styles.dev}>
          <i className={styles.sb1} />
          <i className={styles.sb2} />
          <i className={styles.sb3} />
          <div className={styles.scr}>
            <div className={styles.scale}>
              {(
                ["discover", "measure", "design", "quote", "invoice"] as const
              ).map((id) => {
                const slide = SLIDES.find((s) => s.screen === id);
                const active = SLIDES[cur]?.screen === id;
                return (
                  <div
                    key={`${id}-${active ? playKey : "x"}`}
                    className={cn(
                      styles.sc,
                      active && styles.scOn,
                      active && styles.scPlay,
                    )}
                    data-screen={id}
                    data-testid={`car-screen-${id}`}
                    aria-hidden={!active}
                    inert={!active ? true : undefined}
                  >
                    <PhoneScreen
                      id={id}
                      screenshot={slide?.screenshot || undefined}
                      measurePoster={measurePoster}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(styles.cap, styles.reveal, ready && styles.revealOn)}
        aria-live="polite"
        data-testid="car-caption"
      >
        <span style={{ opacity: capOpacity }}>{capText}</span>
      </div>

      <div
        className={cn(styles.tabs, styles.reveal, ready && styles.revealOn)}
        role="tablist"
        aria-label="Feature steps"
      >
        {SLIDES.map((s, i) => (
          <button
            key={`${s.label}-${i === cur ? tabKey : "x"}`}
            type="button"
            role="tab"
            className={cn(
              styles.tab,
              i === cur && styles.tabOn,
              i < cur && styles.tabDone,
            )}
            aria-selected={i === cur}
            data-testid={`car-tab-${i}`}
            onClick={() => go(i)}
          >
            <span>{s.label}</span>
            <i />
          </button>
        ))}
      </div>

      <p
        className={cn(styles.soon, styles.reveal, ready && styles.revealOn)}
        data-testid="car-ios-soon"
      >
        {iosUrl ? (
          <Link href={iosUrl} className="underline hover:text-white">
            Download on the App Store
          </Link>
        ) : (
          "iPhone app coming soon to the App Store"
        )}
      </p>
    </section>
  );
}
