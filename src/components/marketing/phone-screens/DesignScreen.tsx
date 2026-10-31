"use client";

import { useEffect, useRef } from "react";
import styles from "../FeatureCarousel.module.css";
import { StatusBar } from "./StatusBar";
import { CameraPov } from "./CameraPov";
import { buildSign } from "./generatedArt";

/** AR sign preview on the same wall as Measure. */
export function DesignScreen() {
  const signRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    buildSign(signRef.current, { ext: styles.ext!, f: styles.f! }, {
      layers: 12,
      html: "ALDER<br>&amp; FINCH",
    });
  }, []);

  return (
    <>
      <CameraPov uid="pcd" />
      <div className={styles.vg} />
      <StatusBar />
      <div className={styles.tb}>
        <i>‹</i>
        <div className={styles.hud}>
          <em>Sign preview</em>
        </div>
        <i>⤴</i>
      </div>
      <div className={styles.ar}>
        <div ref={signRef} className={styles.arg}>
          <div className={styles.sk} />
          <div className={styles.shd} aria-hidden>
            ALDER
            <br />
            &amp; FINCH
          </div>
          <div className={styles.halo} aria-hidden>
            ALDER
            <br />
            &amp; FINCH
          </div>
        </div>
      </div>
      <div className={styles.dp}>
        <div className={styles.tiles}>
          <div className={styles.tl}>
            <b>ALDER</b>Channel
          </div>
          <div className={`${styles.tl} ${styles.tlh}`}>
            <b>ALDER</b>Halo-lit
          </div>
          <div className={`${styles.tl} ${styles.tlc}`}>
            <b>ALDER</b>Cabinet
          </div>
          <span className={styles.tring} />
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
