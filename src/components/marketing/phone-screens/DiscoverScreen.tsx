"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import styles from "../FeatureCarousel.module.css";
import { StatusBar } from "./StatusBar";
import { buildMap } from "./generatedArt";

const PINS: Array<{
  left: number;
  top: number;
  d: string;
  score: number;
  sel?: boolean;
  fire?: boolean;
}> = [
  { left: 80, top: 170, d: ".3s", score: 61 },
  { left: 300, top: 190, d: ".5s", score: 74 },
  { left: 150, top: 250, d: ".7s", score: 88 },
  { left: 320, top: 300, d: ".9s", score: 67 },
  { left: 215, top: 330, d: "1.1s", score: 92, sel: true, fire: true },
  { left: 70, top: 380, d: "1.3s", score: 81 },
  { left: 290, top: 430, d: "1.5s", score: 58 },
  { left: 150, top: 490, d: "1.7s", score: 70 },
];

const DISTANCES = [
  "Finding sites…",
  "480 ft away",
  "310 ft away",
  "120 ft away",
  "You're here",
];

const NEARBY: Array<{
  score: number;
  name: string;
  addr: string;
  value: string;
  dist: string;
  fire?: boolean;
}> = [
  {
    score: 92,
    name: "Mixed-use tower",
    addr: "W Hubbard St, Chicago",
    value: "$48M",
    dist: "40 ft",
    fire: true,
  },
  {
    score: 88,
    name: "Medical office",
    addr: "N Clark St",
    value: "$21M",
    dist: "0.2 mi",
  },
  {
    score: 81,
    name: "Retail fit-out",
    addr: "W Kinzie St",
    value: "$3.2M",
    dist: "0.4 mi",
  },
  {
    score: 74,
    name: "Hotel renovation",
    addr: "N La Salle St",
    value: "$12M",
    dist: "0.6 mi",
  },
];

const DIST_CLASSES = [styles.d0, styles.d1, styles.d2, styles.d3, styles.d4];

function FlameIcon({ gradId }: { gradId: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#FF3B00" />
          <stop offset=".55" stopColor="#FF8A00" />
          <stop offset="1" stopColor="#FFC21A" />
        </linearGradient>
      </defs>
      <path
        d="M12 1.5C12.7 5 17 7.2 18 11.8 18.8 15.8 16.2 20.6 12 21.8 7.8 20.6 5.2 15.8 6 11.8 6.5 9.5 8.2 8.2 9.1 6.1 9.9 7.5 10.3 8.7 11.1 9.1 11.7 6.9 11.5 4 12 1.5Z"
        fill={`url(#${gradId})`}
      />
      <path
        d="M12 21.8C9.6 21 8.5 18.9 9.2 16.9 9.6 15.7 10.8 15 12 13.4 13.2 15 14.4 15.7 14.8 16.9 15.5 18.9 14.4 21 12 21.8Z"
        fill="#FFE27A"
      />
    </svg>
  );
}

export function DiscoverScreen() {
  const mapRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    buildMap(mapRef.current);
  }, []);

  return (
    <>
      <div className={styles.mz}>
        <svg
          ref={mapRef}
          className={styles.mapart}
          viewBox="0 0 390 844"
          aria-hidden
        />
        <svg className={styles.trail} viewBox="0 0 390 844" aria-hidden>
          <path pathLength={1000} d="M118 690V552H180L213 358" />
        </svg>
        <div className={styles.me} />
        {PINS.map((p) => {
          let inner: ReactNode = p.score;
          if (p.fire) inner = <FlameIcon gradId="fg1" />;
          return (
            <div
              key={p.score}
              className={cn(
                styles.bg,
                p.sel && styles.sel,
                p.fire && styles.bgFire,
              )}
              style={
                {
                  left: p.left,
                  top: p.top,
                  ["--d" as string]: p.d,
                } as CSSProperties
              }
            >
              <i>{inner}</i>
            </div>
          );
        })}
      </div>
      <StatusBar light />
      <div className={styles.fr}>
        <span className={styles.frOn}>Ready to buy</span>
        <span>Commercial</span>
        <span>Signs</span>
      </div>
      <div className={styles.dist}>
        {DISTANCES.map((d, k) => (
          <u key={d} className={DIST_CLASSES[k]}>
            {d}
          </u>
        ))}
      </div>
      <div className={styles.sheet}>
        <div className={styles.grab} />
        <div className={styles.sh1}>
          <b>Ready to buy</b>
          <span>4 within 1 mi</span>
        </div>
        {NEARBY.map((n, k) => (
          <div
            key={n.score}
            className={cn(styles.nr, k === 0 ? styles.nrTop : styles.nrO)}
            style={{ ["--i" as string]: k } as CSSProperties}
          >
            <span className={cn(styles.nb, n.fire && styles.nbFl)}>
              {n.fire ? <FlameIcon gradId="fg2" /> : n.score}
            </span>
            <div className={styles.nrT}>
              <h4>{n.name}</h4>
              <small>{n.addr}</small>
            </div>
            <div className={styles.nrR}>
              <b>{n.value}</b>
              {n.dist}
            </div>
          </div>
        ))}
        <div className={styles.stats}>
          <div>
            <b>Framing</b>Phase
          </div>
          <div>
            <b>6 wks</b>To buy
          </div>
          <div>
            <b>Signs</b>Trade
          </div>
        </div>
        <div className={cn(styles.cta, styles.s1btn, styles.press)}>
          Start job
        </div>
      </div>
      <div className={cn(styles.toast, styles.d1)}>
        Job started: Mixed-use tower
      </div>
    </>
  );
}
