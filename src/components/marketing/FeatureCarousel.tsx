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
 * Full-bleed carousel hero: stationary value header + per-slide caption,
 * crossfading backgrounds, phone that only appears during the action window.
 */
export function FeatureCarousel({ ready, firstVideoRef }: Props) {
  const carRef = useRef<HTMLElement | null>(null);
  const phsRef = useRef<HTMLDivElement | null>(null);
  const videoByKey = useRef<Map<string, HTMLVideoElement>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tinRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchX0 = useRef<number | null>(null);
  const curRef = useRef(-1);
  const [cur, setCur] = useState(0);
  const [vis, setVis] = useState(true);
  const [reduced, setReduced] = useState(true);
  const [phoneShow, setPhoneShow] = useState(false);
  const [playKey, setPlayKey] = useState(0);
  const [capText, setCapText] = useState(SLIDES[0]!.caption);
  const [capOpacity, setCapOpacity] = useState(1);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const iosUrl = process.env.NEXT_PUBLIC_IOS_APP_URL?.trim() || "";

  const videos = useMemo(() => uniqueVideos(SLIDES), []);

  const clearArm = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearPhoneTimers = useCallback(() => {
    if (tinRef.current) clearTimeout(tinRef.current);
    if (toutRef.current) clearTimeout(toutRef.current);
    tinRef.current = null;
    toutRef.current = null;
  }, []);

  const applyPlaybackRate = useCallback((el: HTMLElement | null, speed: number) => {
    if (!el || !speed || speed === 1) return;
    try {
      el.getAnimations({ subtree: true }).forEach((a) => {
        a.playbackRate = speed;
      });
    } catch {
      /* ignore */
    }
  }, []);

  const showPhone = useCallback(
    (i: number) => {
      const s = SLIDES[i]!;
      setPlayKey((k) => k + 1);
      setPhoneShow(true);
      // After React paints .scPlay, bump WAAPI playbackRate
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const sc = phsRef.current?.querySelector(
            `[data-screen="${s.screen}"].${styles.scPlay}, [data-screen="${s.screen}"]`,
          ) as HTMLElement | null;
          applyPlaybackRate(sc, s.speed);
        });
      });
    },
    [applyPlaybackRate],
  );

  const schedulePhone = useCallback(
    (i: number) => {
      clearPhoneTimers();
      setPhoneShow(false);
      const s = SLIDES[i]!;
      const w = s.phone || { in: 0, out: s.duration };
      if (reduced) {
        showPhone(i);
        return;
      }
      tinRef.current = setTimeout(() => showPhone(i), Math.max(w.in, 500));
      toutRef.current = setTimeout(
        () => setPhoneShow(false),
        Math.max(w.in + 800, w.out - 300),
      );
    },
    [clearPhoneTimers, reduced, showPhone],
  );

  const goRef = useRef<(i: number) => void>(() => {});

  const arm = useCallback(() => {
    clearArm();
    const i = curRef.current;
    if (i < 0) return;
    if (!reduced && vis && ready) {
      const dur = SLIDES[i]?.duration ?? INT;
      timerRef.current = setTimeout(() => goRef.current(i + 1), dur);
    }
  }, [clearArm, reduced, vis, ready]);

  const go = useCallback(
    (i: number) => {
      const next = ((i % N) + N) % N;
      const prev = curRef.current;
      if (next === prev) return;

      const slide = SLIDES[next]!;
      const key = slide.video.mp4;
      const prevKey = prev >= 0 ? SLIDES[prev]!.video.mp4 : null;

      const cv = videoByKey.current.get(key);
      if (cv && key !== prevKey && cv.currentTime > 0) {
        try {
          cv.currentTime = 0;
        } catch {
          /* ignore */
        }
      }

      for (const [k, v] of videoByKey.current) {
        const on = k === key;
        v.classList.toggle(styles.bgvOn, on);
        if (on) {
          v.preload = "auto";
          v.style.objectPosition = slide.focus || "50% 50%";
          if (vis && !reduced) void v.play().catch(() => {});
        } else {
          window.setTimeout(() => {
            if (!v.classList.contains(styles.bgvOn)) v.pause();
          }, 900);
        }
      }

      const nx = videoByKey.current.get(SLIDES[(next + 1) % N]!.video.mp4);
      if (nx && nx !== cv) nx.preload = "auto";

      curRef.current = next;
      setCur(next);

      setCapOpacity(0);
      window.setTimeout(() => {
        setCapText(slide.caption);
        setCapOpacity(1);
      }, 200);

      clearPhoneTimers();
      setPhoneShow(false);
      if (ready) schedulePhone(next);

      window.setTimeout(() => arm(), 0);
    },
    [vis, reduced, ready, clearPhoneTimers, schedulePhone, arm],
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

  useEffect(() => {
    if (curRef.current >= 0) return;
    const id = requestAnimationFrame(() => {
      if (curRef.current < 0 && videoByKey.current.size > 0) go(0);
    });
    return () => cancelAnimationFrame(id);
  }, [go, videos.length]);

  useEffect(() => {
    if (vis && ready) arm();
    else clearArm();
    if (vis && !reduced) {
      const i = curRef.current >= 0 ? curRef.current : 0;
      void videoByKey.current.get(SLIDES[i]!.video.mp4)?.play().catch(() => {});
    } else {
      for (const v of videoByKey.current.values()) v.pause();
    }
    return () => clearArm();
  }, [vis, ready, reduced, arm, clearArm]);

  // intro-done: restart clip + phone window + arm
  useEffect(() => {
    if (!ready) return;
    const i = curRef.current >= 0 ? curRef.current : 0;
    const v = videoByKey.current.get(SLIDES[i]!.video.mp4);
    if (v) {
      try {
        v.currentTime = 0;
      } catch {
        /* ignore */
      }
      if (!reduced) void v.play().catch(() => {});
    }
    schedulePhone(i);
    arm();
  }, [ready, reduced, schedulePhone, arm]);

  useEffect(() => {
    return () => {
      clearArm();
      clearPhoneTimers();
    };
  }, [clearArm, clearPhoneTimers]);

  const tryPlay = useCallback(() => {
    if (reduced) return;
    const i = curRef.current >= 0 ? curRef.current : 0;
    void videoByKey.current.get(SLIDES[i]!.video.mp4)?.play().catch(() => {});
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
  const activeScreen = SLIDES[cur]!.screen;

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
            transition: "opacity .8s",
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
            style={
              {
                objectPosition:
                  SLIDES.find((s) => s.video.mp4 === vid.mp4)?.focus ||
                  "50% 50%",
              } as CSSProperties
            }
            onPlaying={() => setPlayingKey(vid.mp4)}
          >
            <source src={vid.webm} type="video/webm" />
            <source src={vid.mp4} type="video/mp4" />
          </video>
        ))}
      </div>

      <div
        ref={phsRef}
        className={cn(
          styles.phs,
          styles.reveal,
          ready && styles.revealOn,
          phoneShow && styles.phsShow,
        )}
        data-s={activeScreen}
        data-testid="car-phone"
        aria-hidden={!phoneShow}
      >
        <div className={styles.dev}>
          <i className={styles.sb1} />
          <i className={styles.sb2} />
          <i className={styles.sb3} />
          <div className={styles.scr}>
            <div className={styles.scale}>
              {(["discover", "measure", "design", "quote"] as const).map(
                (id) => {
                  const slide = SLIDES.find((s) => s.screen === id);
                  const active = activeScreen === id && phoneShow;
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
                },
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(styles.hh, styles.reveal, ready && styles.revealOn)}
        data-testid="car-header"
      >
        <h2>
          Find the job.
          <br />
          Win the work.
        </h2>
        <div className={styles.cap} aria-live="polite" data-testid="car-caption">
          <span style={{ opacity: capOpacity }}>{capText}</span>
        </div>
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
