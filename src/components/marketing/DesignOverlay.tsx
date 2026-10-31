"use client";

import { cn } from "@/lib/cn";
import styles from "./CarouselOverlays.module.css";

type Props = {
  show: boolean;
  play: boolean;
};

/** Floating Design cards (no phone) — storefront preview, styles, color/size, estimate. */
export function DesignOverlay({ show, play }: Props) {
  return (
    <div
      className={cn(styles.dx, show && styles.dxShow, play && styles.dxPlay)}
      data-testid="car-design-cards"
      aria-hidden={!show}
    >
      <div className={styles.dxk}>
        <div className={cn(styles.co, styles.dxa)} style={{ ["--d" as string]: ".1s" }}>
          <svg viewBox="0 0 350 196" preserveAspectRatio="xMidYMin slice" aria-hidden>
            <defs>
              <linearGradient id="dxg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#8FA9BA" />
                <stop offset="1" stopColor="#C9D8E0" />
              </linearGradient>
            </defs>
            <rect width="350" height="196" fill="#E3DDD0" />
            <rect y="12" width="350" height="84" fill="#24262A" />
            <rect y="12" width="350" height="4" fill="#3a3d42" />
            <rect x="22" y="110" width="150" height="100" rx="4" fill="url(#dxg)" />
            <path d="M22 110H84L22 172Z" fill="#fff" opacity=".18" />
            <rect x="22" y="110" width="150" height="100" rx="4" fill="none" stroke="#1d1f22" strokeWidth="4" />
            <path d="M97 110V210" stroke="#1d1f22" strokeWidth="3" />
            <rect x="192" y="110" width="136" height="100" rx="4" fill="url(#dxg)" />
            <rect x="192" y="110" width="136" height="100" rx="4" fill="none" stroke="#1d1f22" strokeWidth="4" />
            <circle cx="208" cy="165" r="4" fill="#1d1f22" />
          </svg>
          <div className={styles.dxn} />
          <div className={styles.dxlit} />
          <span className={styles.dxtt}>Sign design · Alder &amp; Finch</span>
          <div className={styles.dxs}>
            <div className={styles.dxr} />
            <div className={styles.sgz}>
              <div className={styles.sgw}>
                <div className={cn(styles.vs, styles.vs1)}>ALDER &amp; FINCH</div>
                <div className={cn(styles.vs, styles.vs2)}>Alder &amp; Finch</div>
                <div className={cn(styles.vs, styles.vs3)}>ALDER &amp; FINCH</div>
              </div>
            </div>
          </div>
          <span className={styles.spk} style={{ left: "12%", top: "20%", ["--t" as string]: "0s" }}>
            ✦
          </span>
          <span className={styles.spk} style={{ left: "80%", top: "16%", ["--t" as string]: ".4s" }}>
            ✦
          </span>
          <span className={styles.spk} style={{ left: "46%", top: "10%", ["--t" as string]: ".8s" }}>
            ✦
          </span>
          <span className={styles.spk} style={{ left: "90%", top: "44%", ["--t" as string]: ".2s" }}>
            ✦
          </span>
          <span className={styles.spk} style={{ left: "5%", top: "46%", ["--t" as string]: ".6s" }}>
            ✦
          </span>
          <div className={styles.dxm}>
            <u className={styles.dy}>Day</u>
            <u className={styles.nt}>Night</u>
          </div>
        </div>
        <div className={cn(styles.co, styles.dxb)} style={{ ["--d" as string]: ".4s" }}>
          <u className={styles.p1}>Bold</u>
          <u className={styles.p2}>Classic</u>
          <u className={styles.p3}>Halo-lit</u>
        </div>
        <div className={cn(styles.co, styles.dxc)} style={{ ["--d" as string]: ".7s" }}>
          <div className={styles.dxw}>
            <i />
            <b style={{ background: "#E8C27A" }} />
            <b style={{ background: "#FF6B5E" }} />
            <b style={{ background: "#6CC4FF" }} />
            <b style={{ background: "#fff" }} />
          </div>
          <div className={styles.dxz}>
            <s>−</s>
            <span>
              <u className={styles.z1}>12′ 2″</u>
              <u className={styles.z2}>14′ 0″</u>
            </span>
            <s className={styles.pl}>+</s>
          </div>
        </div>
        <div className={cn(styles.co, styles.dxd)} style={{ ["--d" as string]: "1s" }}>
          <div>
            <small>Estimate</small>
            <span className={styles.pv}>
              <u className={styles.q1}>$3,900</u>
              <u className={styles.q2}>$4,350</u>
              <u className={styles.q3}>$4,820</u>
              <u className={styles.q4}>$5,240</u>
            </span>
          </div>
          <div className={styles.ab}>
            <u className={styles.n}>Add to estimate</u>
            <u className={styles.y}>Added ✓</u>
          </div>
        </div>
      </div>
    </div>
  );
}
