"use client";

import styles from "../FeatureCarousel.module.css";
import { StatusBar } from "./StatusBar";

/** Flat sign designer — no AR, no 3D, no tilt. */
export function DesignScreen() {
  return (
    <div className={styles.dz}>
      <StatusBar light />
      <div className={styles.dzt}>
        <i>‹</i>
        <b>Sign designer</b>
        <i>✓</i>
      </div>
      <div className={styles.dzc}>
        <svg
          viewBox="0 0 358 352"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden
        >
          <defs>
            <linearGradient id="dzg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#8FA9BA" />
              <stop offset="1" stopColor="#C9D8E0" />
            </linearGradient>
          </defs>
          <rect width="358" height="352" fill="#E3DDD0" />
          <rect x="0" y="34" width="358" height="116" fill="#24262A" />
          <rect x="0" y="34" width="358" height="4" fill="#3a3d42" />
          <rect
            x="36"
            y="178"
            width="168"
            height="170"
            rx="4"
            fill="url(#dzg)"
          />
          <path d="M36 178H110L36 262Z" fill="#fff" opacity=".18" />
          <rect
            x="36"
            y="178"
            width="168"
            height="170"
            rx="4"
            fill="none"
            stroke="#1d1f22"
            strokeWidth="5"
          />
          <path d="M120 178V348" stroke="#1d1f22" strokeWidth="3" />
          <rect
            x="226"
            y="178"
            width="96"
            height="174"
            rx="4"
            fill="url(#dzg)"
          />
          <rect
            x="226"
            y="178"
            width="96"
            height="174"
            rx="4"
            fill="none"
            stroke="#1d1f22"
            strokeWidth="5"
          />
          <circle cx="240" cy="272" r="4" fill="#1d1f22" />
          <rect x="0" y="348" width="358" height="4" fill="#b9b2a2" />
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
        <div className={styles.tiles}>
          <div className={`${styles.tl} ${styles.tla}`}>
            <b>ALDER</b>Bold
          </div>
          <div className={`${styles.tl} ${styles.tlb}`}>
            <b>Alder</b>Classic
          </div>
          <div className={`${styles.tl} ${styles.tlc}`}>
            <b>ALDER</b>Halo-lit
          </div>
          <span className={styles.tring} />
        </div>
        <div className={styles.dzmn}>
          <span>Material</span>
          <b>
            <u className={styles.m1}>Painted aluminum</u>
            <u className={styles.m2}>Brushed brass</u>
            <u className={styles.m3}>Halo-lit aluminum</u>
          </b>
        </div>
        <div className={styles.tot}>
          <span>From your price book</span>
          <b>
            <u className={styles.v1}>$3,900</u>
            <u className={styles.v2}>$4,350</u>
            <u className={styles.v3}>$4,820</u>
          </b>
        </div>
        <div className={styles.dzb}>
          <u className={styles.n}>Add to estimate</u>
          <u className={styles.y}>Added to estimate</u>
        </div>
      </div>
    </div>
  );
}
