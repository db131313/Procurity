"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import styles from "../FeatureCarousel.module.css";
import { StatusBar } from "./StatusBar";
import { buildMap } from "./generatedArt";

const PINS: Array<{ left: number; top: number; d: string; score: number; sel?: boolean }> = [
  { left: 80, top: 170, d: ".3s", score: 61 },
  { left: 300, top: 190, d: ".5s", score: 74 },
  { left: 150, top: 250, d: ".7s", score: 88 },
  { left: 320, top: 300, d: ".9s", score: 67 },
  { left: 215, top: 330, d: "1.1s", score: 92, sel: true },
  { left: 70, top: 380, d: "1.3s", score: 81 },
  { left: 290, top: 430, d: "1.5s", score: 58 },
  { left: 150, top: 490, d: "1.7s", score: 70 },
];

const DISTANCES = ["Finding sites…", "480 ft away", "310 ft away", "120 ft away", "You're here"];

const NEARBY: Array<{ score: number; name: string; addr: string; value: string; dist: string }> = [
  { score: 92, name: "Mixed-use tower", addr: "W Hubbard St, Chicago", value: "$48M", dist: "40 ft" },
  { score: 88, name: "Medical office", addr: "N Clark St", value: "$21M", dist: "0.2 mi" },
  { score: 81, name: "Retail fit-out", addr: "W Kinzie St", value: "$3.2M", dist: "0.4 mi" },
  { score: 74, name: "Hotel renovation", addr: "N La Salle St", value: "$12M", dist: "0.6 mi" },
];

const DIST_CLASSES = [styles.d0, styles.d1, styles.d2, styles.d3, styles.d4];

export function DiscoverScreen() {
  const mapRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    buildMap(mapRef.current);
  }, []);

  return (
    <>
      <div className={styles.mz}>
        <svg ref={mapRef} className={styles.mapart} viewBox="0 0 390 844" aria-hidden />
        <svg className={styles.trail} viewBox="0 0 390 844" aria-hidden>
          <path pathLength={1000} d="M118 690V552H180L213 358" />
        </svg>
        <div className={styles.me} />
        {PINS.map((p) => (
          <div
            key={p.score}
            className={cn(styles.bg, p.sel && styles.sel)}
            style={{ left: p.left, top: p.top, ["--d" as string]: p.d } as CSSProperties}
          >
            <i>{p.score}</i>
          </div>
        ))}
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
            <span className={styles.nb}>{n.score}</span>
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
        <div className={cn(styles.cta, styles.s1btn, styles.press)}>Start job</div>
      </div>
      <div className={cn(styles.toast, styles.d1)}>Job started: Mixed-use tower</div>
    </>
  );
}
