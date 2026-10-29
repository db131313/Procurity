"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type RefObject,
} from "react";
import Link from "next/link";
import { LAYOUT, SLIDES, uniqueVideos } from "@/content/carousel";
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
 * Full-bleed carousel hero with direction-aware horizontal slide transitions.
 * Progress bars are hidden; navigate via swipe / arrow keys.
 * LAYOUT 'split' | 'center'; mobile bleeds the phone off the bottom.
 */
export function FeatureCarousel({ ready, firstVideoRef }: Props) {
  const carRef = useRef<HTMLElement | null>(null);
  const videoByKey = useRef<Map<string, HTMLVideoElement>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchX0 = useRef<number | null>(null);
  const curRef = useRef(-1);
  const [cur, setCur] = useState(0);
  const [vis, setVis] = useState(true);
  const [reduced, setReduced] = useState(true);
  const [playKey, setPlayKey] = useState(0);
  const [capText, setCapText] = useState(SLIDES[0]!.caption);
  const [devSwap, setDevSwap] = useState<"none" | "out" | "in">("none");
  const [capSwap, setCapSwap] = useState<"none" | "out" | "in">("none");
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [dir, setDir] = useState(1);
  const iosUrl = process.env.NEXT_PUBLIC_IOS_APP_URL?.trim() || "";

  const videos = useMemo(() => uniqueVideos(SLIDES), []);

  const focusByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of SLIDES) {
      if (!m.has(s.video.mp4)) m.set(s.video.mp4, s.focus);
    }
    return m;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const arm = useCallback(() => {
    clearTimer();
    const i = curRef.current;
    if (i < 0) return;
    if (!reduced && vis && ready) {
      const dur = SLIDES[i]?.duration ?? INT;
      timerRef.current = setTimeout(() => {
        goRef.current((i + 1) % N);
      }, dur);
    }
  }, [clearTimer, reduced, vis, ready]);

  const goRef = useRef<(i: number) => void>(() => {});

  const go = useCallback(
    (i: number) => {
      const next = ((i % N) + N) % N;
      const prev = curRef.current;
      if (next === prev) return;

      const first = prev < 0;
      const fwd = first
        ? 1
        : (next - prev + N) % N <= N / 2
          ? 1
          : -1;
      setDir(fwd);
      carRef.current?.style.setProperty("--dir", String(fwd));

      const slide = SLIDES[next]!;
      const key = slide.video.mp4;
      const prevKey = first ? null : SLIDES[prev]!.video.mp4;
      const cv = videoByKey.current.get(key) ?? null;
      const prevV = prevKey ? videoByKey.current.get(prevKey) ?? null : null;

      if (cv && cv !== prevV && cv.currentTime > 0) {
        try {
          cv.currentTime = 0;
        } catch {
          /* ignore */
        }
      }

      for (const [k, v] of videoByKey.current) {
        if (k === key) {
          v.classList.remove(styles.bgvTr);
          v.style.transform = first
            ? "translate3d(0,0,0)"
            : `translate3d(${fwd * 100}%,0,0)`;
          void v.offsetWidth;
          if (!first) {
            v.classList.add(styles.bgvTr);
            v.style.transform = "translate3d(0,0,0)";
          }
          v.classList.add(styles.bgvOn);
          v.preload = "auto";
          v.style.objectPosition = slide.focus || "50% 50%";
          if (vis && !reduced) void v.play().catch(() => {});
        } else if (prevV && v === prevV) {
          v.classList.add(styles.bgvTr);
          v.style.transform = `translate3d(${-fwd * 100}%,0,0)`;
          v.classList.remove(styles.bgvOn);
          window.setTimeout(() => {
            if (!v.classList.contains(styles.bgvOn)) v.pause();
          }, 800);
        } else {
          v.classList.remove(styles.bgvTr, styles.bgvOn);
          v.style.transform = `translate3d(${fwd * 100}%,0,0)`;
          v.pause();
        }
      }

      const nx = videoByKey.current.get(SLIDES[(next + 1) % N]!.video.mp4);
      if (nx && nx !== cv) nx.preload = "auto";

      curRef.current = next;
      setCur(next);

      if (swapTimerRef.current) {
        clearTimeout(swapTimerRef.current);
        swapTimerRef.current = null;
      }

      const applyScreen = () => {
        setCapText(slide.caption);
        setPlayKey((k) => k + 1);
        if (!first && !reduced) {
          setDevSwap("in");
          setCapSwap("in");
        } else {
          setDevSwap("none");
          setCapSwap("none");
        }
      };

      if (first || reduced) {
        applyScreen();
      } else {
        setDevSwap("out");
        setCapSwap("out");
        swapTimerRef.current = setTimeout(applyScreen, 260);
      }

      // re-arm after state settles
      window.setTimeout(() => arm(), 0);
    },
    [vis, reduced, arm],
  );

  goRef.current = go;

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

  // Initial go(0) once videos are mounted
  useEffect(() => {
    if (curRef.current >= 0) return;
    const id = window.requestAnimationFrame(() => {
      if (curRef.current < 0 && videoByKey.current.size > 0) go(0);
    });
    return () => window.cancelAnimationFrame(id);
  }, [go, videos.length]);

  useEffect(() => {
    if (vis && ready) arm();
    else clearTimer();
    if (vis && !reduced) {
      const key = SLIDES[curRef.current >= 0 ? curRef.current : 0]!.video.mp4;
      void videoByKey.current.get(key)?.play().catch(() => {});
    } else {
      for (const v of videoByKey.current.values()) v.pause();
    }
    return () => clearTimer();
  }, [vis, ready, reduced, arm, clearTimer]);

  useEffect(() => {
    if (!ready) return;
    setPlayKey((k) => k + 1);
    arm();
  }, [ready, arm]);

  const tryPlay = useCallback(() => {
    if (reduced) return;
    const i = curRef.current >= 0 ? curRef.current : 0;
    const key = SLIDES[i]!.video.mp4;
    void videoByKey.current.get(key)?.play().catch(() => {});
  }, [reduced]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(curRef.current + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(curRef.current - 1);
    }
  };

  const activePoster = SLIDES[cur]!.video.poster;
  const activeKey = SLIDES[cur]!.video.mp4;

  return (
    <section
      ref={carRef}
      className={cn(styles.car, (!vis || !ready) && styles.paused)}
      id="car"
      data-layout={LAYOUT}
      style={{ ["--dir" as string]: dir } as CSSProperties}
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
        if (Math.abs(d) > 50) go(curRef.current + (d < 0 ? 1 : -1));
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
                if (i === 0) {
                  el.style.transform = "translate3d(0,0,0)";
                  if (firstVideoRef) {
                    (
                      firstVideoRef as { current: HTMLVideoElement | null }
                    ).current = el;
                  }
                }
              }
            }}
            className={styles.bgv}
            muted
            loop
            playsInline
            preload={i === 0 ? "auto" : "metadata"}
            poster={vid.poster}
            style={
              {
                objectPosition: focusByKey.get(vid.mp4) || "50% 50%",
              } as CSSProperties
            }
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
        <div
          className={cn(
            styles.dev,
            devSwap === "out" && styles.devSwapOut,
            devSwap === "in" && styles.devSwapIn,
          )}
        >
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
        <span
          className={cn(
            capSwap === "out" && styles.capSwapOut,
            capSwap === "in" && styles.capSwapIn,
          )}
        >
          {capText}
        </span>
      </div>

      <div
        className={styles.tabs}
        role="tablist"
        aria-label="Feature steps"
        aria-hidden
      >
        {SLIDES.map((s, i) => (
          <button
            key={s.label}
            type="button"
            role="tab"
            className={styles.tab}
            aria-label={s.label}
            aria-selected={i === cur}
            data-testid={`car-tab-${i}`}
            onClick={() => go(i)}
          >
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
