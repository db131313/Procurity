"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import styles from "../FeatureCarousel.module.css";
import { StatusBar } from "./StatusBar";
import { buildMap } from "./generatedArt";

const PINS: Array<{ left: number; top: number; d: string; score: number; sel?: boolean }> = [
  { left: 80, top: 170, d: ".3s", score: 61 },
  { left: 300, top: 190, d: ".55s", score: 74 },
  { left: 150, top: 250, d: ".8s", score: 88 },
  { left: 320, top: 300, d: "1.05s", score: 67 },
  { left: 215, top: 330, d: "1.3s", score: 92, sel: true },
  { left: 70, top: 380, d: "1.55s", score: 81 },
  { left: 290, top: 430, d: "1.8s", score: 58 },
  { left: 150, top: 490, d: "2.05s", score: 70 },
];

export function DiscoverScreen() {
  const mapRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    buildMap(mapRef.current);
  }, []);

  return (
    <>
      <div className={styles.mz}>
        <svg ref={mapRef} className={styles.mapart} viewBox="0 0 390 844" aria-hidden />
        <div className={styles.me} />
        {PINS.map((p) => (
          <div
            key={p.score}
            className={p.sel ? `${styles.bg} ${styles.sel}` : styles.bg}
            style={{ left: p.left, top: p.top, ["--d" as string]: p.d } as CSSProperties}
          >
            <i>{p.score}</i>
          </div>
        ))}
      </div>
      <StatusBar />
      <div className={styles.fr}>
        <span className={styles.frOn}>Commercial</span>
        <span>Score 80+</span>
        <span>Signs</span>
      </div>
      <div className={styles.sheet}>
        <div className={styles.hd}>
          <span className={styles.bd} />
          <div>
            <h4>Mixed-use tower</h4>
            <small>W Hubbard St, Chicago</small>
          </div>
        </div>
        <div className={styles.st3}>
          <div style={{ ["--i" as string]: 0 } as CSSProperties}>
            <b>$48M</b>Value
          </div>
          <div style={{ ["--i" as string]: 1 } as CSSProperties}>
            <b>Framing</b>Phase
          </div>
          <div style={{ ["--i" as string]: 2 } as CSSProperties}>
            <b>6 wks</b>To buy
          </div>
        </div>
        <div className={`${styles.cta} ${styles.s1btn} ${styles.press}`}>Start job</div>
      </div>
      <div className={`${styles.toast} ${styles.d1}`}>Job started: Mixed-use tower</div>
    </>
  );
}
