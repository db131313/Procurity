"use client";

import type { CSSProperties } from "react";
import styles from "../FeatureCarousel.module.css";
import { StatusBar } from "./StatusBar";

/** Flat sign designer — same card UI language as Connect / Estimate. No AR/3D. */
export function DesignScreen() {
  return (
    <div className={styles.dz}>
      <StatusBar light />
      <div className={styles.dzd}>
        <div className={styles.dt}>
          <b>Sign design</b>
          <small>Alder & Finch</small>
        </div>
        <div className={styles.dzc}>
          <svg
            viewBox="0 0 314 218"
            preserveAspectRatio="xMidYMin slice"
            aria-hidden
          >
            <defs>
              <linearGradient id="dzg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#8FA9BA" />
                <stop offset="1" stopColor="#C9D8E0" />
              </linearGradient>
            </defs>
            <rect width="314" height="218" fill="#E3DDD0" />
            <rect x="0" y="16" width="314" height="94" fill="#24262A" />
            <rect x="0" y="16" width="314" height="4" fill="#3a3d42" />
            <rect
              x="26"
              y="124"
              width="132"
              height="100"
              rx="4"
              fill="url(#dzg)"
            />
            <path d="M26 124H84L26 182Z" fill="#fff" opacity=".18" />
            <rect
              x="26"
              y="124"
              width="132"
              height="100"
              rx="4"
              fill="none"
              stroke="#1d1f22"
              strokeWidth="4"
            />
            <path d="M92 124V224" stroke="#1d1f22" strokeWidth="3" />
            <rect
              x="178"
              y="124"
              width="110"
              height="100"
              rx="4"
              fill="url(#dzg)"
            />
            <rect
              x="178"
              y="124"
              width="110"
              height="100"
              rx="4"
              fill="none"
              stroke="#1d1f22"
              strokeWidth="4"
            />
            <circle cx="192" cy="182" r="4" fill="#1d1f22" />
          </svg>
          <div className={styles.dzn} />
          <div className={styles.dzlit} />
          <div className={styles.dzs}>
            <div className={styles.dzr}>
              <span>Sign area · 12′ 2″ × 2′ 6″</span>
            </div>
            <div className={`${styles.vs} ${styles.vs1}`}>ALDER & FINCH</div>
            <div className={`${styles.vs} ${styles.vs2}`}>Alder & Finch</div>
            <div className={`${styles.vs} ${styles.vs3}`}>ALDER & FINCH</div>
          </div>
          <div className={styles.dzm}>
            <u className={styles.dy}>Day</u>
            <u className={styles.nt}>Night</u>
          </div>
        </div>
        <div className={styles.dzp}>
          <u className={styles.p1}>Bold</u>
          <u className={styles.p2}>Classic</u>
          <u className={styles.p3}>Halo-lit</u>
        </div>
        <div
          className={styles.dzk}
          style={{ ["--i" as string]: 0 } as CSSProperties}
        >
          <span>Material</span>
          <b>
            <u className={styles.a1}>Painted aluminum</u>
            <u className={styles.a2}>Brushed brass</u>
            <u className={styles.a3}>Halo-lit aluminum</u>
          </b>
        </div>
        <div
          className={styles.dzk}
          style={{ ["--i" as string]: 1 } as CSSProperties}
        >
          <span>Size</span>
          <b>12′ 2″ × 2′ 6″</b>
        </div>
        <div
          className={`${styles.dzk} ${styles.dpr}`}
          style={{ ["--i" as string]: 2 } as CSSProperties}
        >
          <span>Estimate</span>
          <b>
            <u className={styles.a1}>$3,900</u>
            <u className={styles.a2}>$4,350</u>
            <u className={styles.a3}>$4,820</u>
          </b>
        </div>
      </div>
      <div className={`${styles.dzb} ${styles.cta2}`}>
        <u className={styles.n}>Add to estimate</u>
        <u className={styles.y}>Added to estimate</u>
      </div>
    </div>
  );
}
