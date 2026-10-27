"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { SLIDES } from "@/content/carousel";
import { PhoneScreen } from "./phone-screens";
import { cn } from "@/lib/cn";
import styles from "./FeatureCarousel.module.css";

const INT = 7000;
const N = SLIDES.length;

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Full-bleed feature carousel (Discover → Invoice) with phone mockup.
 * Slide content lives in src/content/carousel.ts — swap videos/copy/screens there.
 */
export function FeatureCarousel() {
  const carRef = useRef<HTMLElement | null>(null);
  const bgRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const measureRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchX0 = useRef<number | null>(null);
  const [cur, setCur] = useState(0);
  const [vis, setVis] = useState(false);
  const [near, setNear] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [tabKey, setTabKey] = useState(0);
  const iosUrl = process.env.NEXT_PUBLIC_IOS_APP_URL?.trim() || "";

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const arm = useCallback(
    (index: number) => {
      clearTimer();
      if (!reduced && vis) {
        timerRef.current = setTimeout(() => {
          setCur((c) => (c + 1) % N);
          setTabKey((k) => k + 1);
        }, INT);
      }
      void index;
    },
    [clearTimer, reduced, vis],
  );

  const go = useCallback(
    (i: number) => {
      const next = ((i % N) + N) % N;
      setCur(next);
      setTabKey((k) => k + 1);
    },
    [],
  );

  useEffect(() => {
    setReduced(prefersReducedMotion());
  }, []);

  // Near-viewport: mount/load videos only when within ~1 viewport
  useEffect(() => {
    const el = carRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setNear(true);
      },
      { rootMargin: "100%", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Visibility for autoplay / pause (≥35%)
  useEffect(() => {
    const el = carRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const on = !!entries[0]?.isIntersecting;
        setVis(on);
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Play/pause videos + arm timer when cur/vis/near/reduced change
  useEffect(() => {
    const slide = SLIDES[cur]!;
    bgRefs.current.forEach((v, k) => {
      if (!v) return;
      if (k === cur) {
        v.preload = "auto";
        if (vis && !reduced && near) void v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
    const pv = measureRef.current;
    if (pv) {
      if (slide.screen === "measure" && vis && !reduced && near) {
        void pv.play().catch(() => {});
      } else {
        pv.pause();
      }
    }
    if (vis) arm(cur);
    else clearTimer();
    return () => clearTimer();
  }, [cur, vis, near, reduced, arm, clearTimer]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(cur + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(cur - 1);
    }
  };

  const measureSlide = SLIDES.find((s) => s.screen === "measure") ?? SLIDES[1]!;

  return (
    <section
      ref={carRef}
      className={cn(styles.car, !vis && styles.paused)}
      id="car"
      aria-roledescription="carousel"
      aria-label="App walkthrough"
      data-testid="feature-carousel"
      tabIndex={0}
      onKeyDown={onKeyDown}
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
          src={SLIDES[cur]!.video.poster}
          alt=""
          fetchPriority={cur === 0 ? "high" : "auto"}
        />
        {near &&
          SLIDES.map((s, i) => (
            <video
              key={s.label}
              ref={(el) => {
                bgRefs.current[i] = el;
              }}
              className={cn(styles.bgv, i === cur && styles.bgvOn)}
              muted
              loop
              playsInline
              preload={i === 0 ? "auto" : "none"}
              poster={s.video.poster}
              onCanPlay={(e) => {
                if (i === cur) (e.currentTarget as HTMLVideoElement).style.opacity = "1";
              }}
            >
              {s.video.webm640 ? (
                <source
                  src={s.video.webm640}
                  type="video/webm"
                  media="(max-width:820px)"
                />
              ) : null}
              {s.video.mp4640 ? (
                <source
                  src={s.video.mp4640}
                  type="video/mp4"
                  media="(max-width:820px)"
                />
              ) : null}
              <source src={s.video.webm} type="video/webm" />
              <source src={s.video.mp4} type="video/mp4" />
            </video>
          ))}
      </div>

      <div className={styles.cps}>
        {SLIDES.map((s, i) => (
          <div key={s.label} className={cn(styles.cp, i === cur && styles.cpOn)}>
            <b>{s.label}</b>
            <h2>{s.title}</h2>
            <p>{s.body}</p>
            {s.cta ? (
              <Link href={s.cta.href} className={cn("b", "bw-btn-primary", "pc-press", "h-11", "px-6", "text-sm")}>
                {s.cta.label}
              </Link>
            ) : null}
          </div>
        ))}
      </div>

      <div className={styles.phs} aria-hidden={false}>
        <div className={styles.dev}>
          <i className={styles.sb1} />
          <i className={styles.sb2} />
          <i className={styles.sb3} />
          <div className={styles.scr}>
            <div className={styles.scale}>
              {(["discover", "measure", "design", "quote", "invoice"] as const).map(
                (id) => {
                  const slide = SLIDES.find((s) => s.screen === id);
                  const active = SLIDES[cur]?.screen === id;
                  return (
                    <div
                      key={id}
                      className={cn(styles.sc, active && styles.scOn)}
                      data-screen={id}
                      data-testid={`car-screen-${id}`}
                      aria-hidden={!active}
                      inert={!active ? true : undefined}
                    >
                      <PhoneScreen
                        id={id}
                        active={!!active}
                        screenshot={slide?.screenshot || undefined}
                        measureVideo={measureSlide.video}
                        measurePlay={near && active}
                        measureRef={measureRef}
                        reducedMotion={reduced}
                      />
                    </div>
                  );
                },
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Feature steps">
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

      <p className={styles.soon} data-testid="car-ios-soon">
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
