"use client";

import type { CSSProperties } from "react";
import styles from "../FeatureCarousel.module.css";
import { StatusBar } from "./StatusBar";
import { CameraPov } from "./CameraPov";

/** AR dimension tool — no triangle mesh. */
export function MeasureScreen() {
  return (
    <>
      <CameraPov uid="pcm" />
      <div className={styles.vg} />
      <div className={styles.dg} aria-hidden />
      <StatusBar />
      <div className={styles.tb}>
        <i>✕</i>
        <div className={styles.hud}>
          <em className={styles.stt}>
            <u className={styles.s1}>Finding surface…</u>
            <u className={styles.s2}>Tap to measure</u>
            <u className={styles.s3}>Saved</u>
          </em>
        </div>
        <i>ft</i>
      </div>
      <svg className={styles.ms} viewBox="0 0 390 844" aria-hidden>
        <defs>
          <pattern
            id="ht"
            width="9"
            height="9"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="3" height="9" fill="rgba(255,255,255,.3)" />
          </pattern>
        </defs>
        <g className={styles.br}>
          <path d="M28 188V150H66" />
          <path d="M324 150H362V188" />
          <path d="M362 612V650H324" />
          <path d="M66 650H28V612" />
        </g>
        <rect className={styles.area} x="140" y="300" width="190" height="124" rx="3" />
        <path className={`${styles.ex} ${styles.ex1}`} d="M140 300V266M330 300V266" />
        <path className={`${styles.ex} ${styles.ex2}`} d="M330 300H364M330 424H364" />
        <path className={`${styles.rl} ${styles.l1}`} pathLength={1} d="M140 272H330" />
        <path className={`${styles.rl} ${styles.l2}`} pathLength={1} d="M358 300V424" />
        <path className={`${styles.tk} ${styles.tk1}`} d="M140 262v20M330 262v20" />
        <path className={`${styles.tk} ${styles.tk2}`} d="M350 300h16M350 424h16" />
      </svg>
      <div
        className={styles.dot}
        style={{ left: 140, top: 300, ["--d" as string]: "2.0s" } as CSSProperties}
      />
      <div
        className={styles.dot}
        style={{ left: 330, top: 300, ["--d" as string]: "3.3s" } as CSSProperties}
      />
      <div
        className={styles.dot}
        style={{ left: 330, top: 424, ["--d" as string]: "4.4s" } as CSSProperties}
      />
      <div
        className={styles.dot}
        style={{ left: 140, top: 424, ["--d" as string]: "4.5s" } as CSSProperties}
      />
      <div className={styles.lv}>
        <u>6′ 4″</u>
        <u>10′ 1″</u>
        <u>11′ 5″</u>
      </div>
      <span className={`${styles.ml} ${styles.mlb}`} style={{ left: 200, top: 258 }}>
        12′ 2″
      </span>
      <span className={`${styles.ml} ${styles.mlc}`} style={{ left: 254, top: 350 }}>
        5′ 0″
      </span>
      <span className={`${styles.ml} ${styles.mld}`} style={{ left: 186, top: 440 }}>
        60.8 sq ft
      </span>
      <div className={styles.ret} aria-hidden />
      <div className={styles.dch}>8′ 4″ to wall</div>
      <div className={styles.res}>
        <div>
          <b>12′ 2″</b>
          <small>Width</small>
        </div>
        <div>
          <b>5′ 0″</b>
          <small>Height</small>
        </div>
        <div>
          <b>60.8</b>
          <small>Sq ft</small>
        </div>
        <div className={styles.sv}>Save</div>
      </div>
      <div className={styles.addb}>
        <span>+</span>
      </div>
      <div className={styles.mm}>
        <span>Photo</span>
        <span>Scan</span>
        <span className={styles.mmOn}>Measure</span>
        <span>Room</span>
      </div>
    </>
  );
}
