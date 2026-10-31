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
 * crossfading backgrounds (wait for paint), phone only during action window.
 */
export function FeatureCarousel({ ready, firstVideoRef }: Props) {
  const carRef = useRef<HTMLElement | null>(null);
  const phsRef = useRef<HTMLDivElement | null>(null);
  const videoByKey = useRef<Map<string, HTMLVideoElement>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tinRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tfadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchX0 = useRef<number | null>(null);
  const curRef = useRef(-1);
  const visRef = useRef(true);
  const [cur, setCur] = useState(0);
  const [vis, setVis] = useState(true);
  const [reduced, setReduced] = useState(true);
  const [phoneShow, setPhoneShow] = useState(false);
  const [playKey, setPlayKey] = useState(0);
  const [capText, setCapText] = useState(SLIDES[0]!.caption);
  const [capOpacity, setCapOpacity] = useState(1);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [onKey, setOnKey] = useState<string | null>(null);
  const iosUrl = process.env.NEXT_PUBLIC_IOS_APP_URL?.trim() || "";

  const videos = useMemo(() => uniqueVideos(SLIDES), []);

  const playVideo = useCallback(
    (v: HTMLVideoElement | null | undefined) => {
      if (reduced || !v) return;
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    },
    [reduced],
  );

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
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const sc = phsRef.current?.querySelector(
            `[data-screen="${s.screen}"]`,
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
    if (!reduced && visRef.current && ready) {
      const dur = SLIDES[i]?.duration ?? INT;
      timerRef.current = setTimeout(() => goRef.current(i + 1), dur);
    }
  }, [clearArm, reduced, ready]);

  /** Fade in only once the clip is painting (or after 1.5s fallback). */
  const reveal = useCallback(
    (i: number, key: string) => {
      if (tfadeRef.current) clearTimeout(tfadeRef.current);
      const cv = videoByKey.current.get(key);
      if (!cv) {
        setOnKey(key);
        return;
      }
      let done = false;
      const fin = () => {
        if (done || curRef.current !== i) return;
        done = true;
        setOnKey(key);
        for (const [k, v] of videoByKey.current) {
          if (k !== key) {
            window.setTimeout(() => {
              if (!v.classList.contains(styles.bgvOn)) v.pause();
            }, 950);
          }
        }
      };
      playVideo(cv);
      if (cv.readyState >= 3) {
        tfadeRef.current = setTimeout(fin, 60);
      } else {
        const h = () => {
          cv.removeEventListener("canplay", h);
          fin();
        };
        cv.addEventListener("canplay", h);
        tfadeRef.current = setTimeout(fin, 1500);
      }
    },
    [playVideo],
  );

  const go = useCallback(
    (i: number) => {
      const next = ((i % N) + N) % N;
      const prev = curRef.current;
      if (next === prev) return;

      const slide = SLIDES[next]!;
      const key = slide.video.mp4;
      const prevKey = prev >= 0 ? SLIDES[prev]!.video.mp4 : null;

      const cv = videoByKey.current.get(key);
      if (cv && key !== prevKey) {
        try {
          cv.currentTime = 0;
        } catch {
          /* ignore */
        }
      }
      if (cv) {
        cv.preload = "auto";
        cv.style.objectPosition = slide.focus || "50% 50%";
      }

      const nx = videoByKey.current.get(SLIDES[(next + 1) % N]!.video.mp4);
      if (nx && nx !== cv) nx.preload = "auto";

      curRef.current = next;
      setCur(next);

      reveal(next, key);

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
    [ready, clearPhoneTimers, schedulePhone, arm, reveal],
  );

  goRef.current = go;

  useEffect(() => {
    setReduced(prefersReducedMotion());
  }, []);

  // Visibility via getBoundingClientRect (IO unreliable in embeds); never blocks first play
  useEffect(() => {
    const car = carRef.current;
    if (!car) return;
    let tick = false;
    const check = () => {
      tick = false;
      const r = car.getBoundingClientRect();
      const v = r.bottom > 80 && r.top < window.innerHeight - 80;
      if (v && !visRef.current) {
        visRef.current = true;
        setVis(true);
        const i = curRef.current >= 0 ? curRef.current : 0;
        playVideo(videoByKey.current.get(SLIDES[i]!.video.mp4));
        arm();
      } else if (!v && visRef.current) {
        visRef.current = false;
        setVis(false);
        for (const x of videoByKey.current.values()) x.pause();
        clearArm();
      }
    };
    const onS = () => {
      if (!tick) {
        tick = true;
        requestAnimationFrame(check);
      }
    };
    window.addEventListener("scroll", onS, { passive: true });
    window.addEventListener("resize", onS);
    return () => {
      window.removeEventListener("scroll", onS);
      window.removeEventListener("resize", onS);
    };
  }, [arm, clearArm, playVideo]);

  // First paint: go(0) once videos are mounted
  useEffect(() => {
    if (curRef.current >= 0) return;
    const id = requestAnimationFrame(() => {
      if (curRef.current < 0 && videoByKey.current.size > 0) go(0);
    });
    return () => cancelAnimationFrame(id);
  }, [go, videos.length]);

  // Gesture / visibility retries for autoplay
  useEffect(() => {
    const retry = () => {
      const i = curRef.current >= 0 ? curRef.current : 0;
      const v = videoByKey.current.get(SLIDES[i]!.video.mp4);
      if (v && v.paused && visRef.current) playVideo(v);
    };
    const events = [
      "pointerdown",
      "touchstart",
      "touchend",
      "click",
      "keydown",
      "wheel",
      "scroll",
    ] as const;
    for (const ev of events) window.addEventListener(ev, retry, { passive: true });
    const onVis = () => {
      if (!document.hidden && visRef.current) retry();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      for (const ev of events) window.removeEventListener(ev, retry);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [playVideo]);

  // intro-done: restart clip + phone + arm; later bump remaining preloads
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
      playVideo(v);
    }
    schedulePhone(i);
    arm();
    const t = window.setTimeout(() => {
      for (const x of videoByKey.current.values()) {
        if (x.preload !== "auto") x.preload = "auto";
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [ready, playVideo, schedulePhone, arm]);

  useEffect(() => {
    return () => {
      clearArm();
      clearPhoneTimers();
      if (tfadeRef.current) clearTimeout(tfadeRef.current);
    };
  }, [clearArm, clearPhoneTimers]);

  // Preload posters
  useEffect(() => {
    for (const s of SLIDES) {
      const img = new Image();
      img.src = s.video.poster;
    }
  }, []);

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
  const fadeOnKey = onKey ?? activeKey;

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
      onPointerDown={() => {
        const i = curRef.current >= 0 ? curRef.current : 0;
        playVideo(videoByKey.current.get(SLIDES[i]!.video.mp4));
      }}
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
                el.muted = true;
                el.defaultMuted = true;
                el.setAttribute("muted", "");
                el.setAttribute("playsinline", "");
                el.setAttribute("webkit-playsinline", "");
                if (i === 0 && firstVideoRef) {
                  (
                    firstVideoRef as { current: HTMLVideoElement | null }
                  ).current = el;
                }
                // Kick autoplay on first paint for slide 1
                if (i === 0 && curRef.current <= 0) playVideo(el);
              }
            }}
            className={cn(styles.bgv, fadeOnKey === vid.mp4 && styles.bgvOn)}
            muted
            loop
            playsInline
            preload={i < 2 ? "auto" : "metadata"}
            poster={vid.poster}
            disablePictureInPicture
            style={
              {
                objectPosition:
                  SLIDES.find((s) => s.video.mp4 === vid.mp4)?.focus ||
                  "50% 50%",
              } as CSSProperties
            }
            onPlaying={() => setPlayingKey(vid.mp4)}
            onLoadedData={(e) => {
              const el = e.currentTarget;
              if (el === videoByKey.current.get(SLIDES[curRef.current >= 0 ? curRef.current : 0]!.video.mp4)) {
                playVideo(el);
              }
            }}
          >
            {vid.webm640 && vid.mp4640 ? (
              <>
                <source
                  src={vid.webm640}
                  type="video/webm"
                  media="(max-width:820px)"
                />
                <source
                  src={vid.mp4640}
                  type="video/mp4"
                  media="(max-width:820px)"
                />
              </>
            ) : null}
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
              {(
                ["discover", "contact", "measure", "design", "quote"] as const
              ).map((id) => {
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
              })}
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
