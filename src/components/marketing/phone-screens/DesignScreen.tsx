"use client";

import { useEffect, useRef } from "react";
import styles from "../FeatureCarousel.module.css";
import { StatusBar } from "./StatusBar";
import { buildSign } from "./generatedArt";

export function DesignScreen() {
  const signRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    buildSign(signRef.current, { ext: styles.ext!, f: styles.f! });
  }, []);

  return (
    <>
      <StatusBar />
      <div className={styles.dh}>
        <b>Design</b>
        <div className={styles.seg}>
          <span className={styles.s2d}>2D</span>
          <span className={styles.s3d}>3D</span>
        </div>
      </div>
      <div className={styles.vp}>
        <div className={styles.cam3d}>
          <div className={styles.world}>
            <div className={styles.gnd} />
            <div className={styles.wall}>
              <div className={styles.fas} />
              <div className={styles.win} />
            </div>
            <div className={styles.cone} aria-hidden />
            <div ref={signRef} className={styles.sg}>
              <div className={styles.sk} />
              <div className={styles.shd} aria-hidden>
                ALDER &amp; FINCH
              </div>
              <div className={styles.halo} aria-hidden>
                ALDER &amp; FINCH
              </div>
            </div>
            <div className={styles.dimx}>
              <i />
              <i />
              <b>12′ 2″</b>
            </div>
          </div>
        </div>
        <div className={styles.hint}>Drag to orbit</div>
      </div>
      <div className={styles.panel}>
        <div className={styles.chips}>
          <i className={styles.chipOn}>Channel letters</i>
          <i>Cabinet</i>
          <i>Monument</i>
        </div>
        <div className={styles.sw}>
          <b style={{ background: "#c9ccd0" }} />
          <b style={{ background: "#f3f3f1" }} />
          <b style={{ background: "#2b2d30" }} />
          <span className={styles.so} />
        </div>
        <div className={styles.mn}>
          <u className={styles.mna}>Matte black</u>
          <u className={styles.mnb}>Brushed aluminum</u>
        </div>
        <div className={styles.lit}>
          <span>Illuminated</span>
          <i />
        </div>
        <div className={styles.tot}>
          <span>From your price book</span>
          <b>
            <u className={styles.v1}>$3,900</u>
            <u className={styles.v2}>$4,350</u>
            <u className={styles.v3}>$4,820</u>
          </b>
        </div>
      </div>
    </>
  );
}
