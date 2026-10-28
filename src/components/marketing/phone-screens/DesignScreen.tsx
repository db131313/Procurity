import styles from "../FeatureCarousel.module.css";
import { StatusBar } from "./StatusBar";

const LETTERS = [
  { ch: "A", i: 0 },
  { ch: "L", i: 1 },
  { ch: "D", i: 2 },
  { ch: "E", i: 3 },
  { ch: "R", i: 4 },
  { ch: "&", i: 5, gap: true },
  { ch: "F", i: 6 },
  { ch: "I", i: 7 },
  { ch: "N", i: 8 },
  { ch: "C", i: 9 },
  { ch: "H", i: 10 },
];

export function DesignScreen() {
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
      <div className={styles.canvas}>
        <div className={styles.sign}>
          {LETTERS.map((l) => (
            <span
              key={`${l.ch}-${l.i}`}
              className={styles.ltr}
              style={{
                ["--i" as string]: l.i,
                ...(l.gap ? { margin: "0 .35em" } : null),
              }}
            >
              {l.ch}
            </span>
          ))}
        </div>
        <div className={styles.dim}>12′ × 2′</div>
      </div>
      <div className={styles.panel}>
        <small>Type</small>
        <div className={styles.chips}>
          <i className={styles.chipOn}>Channel letters</i>
          <i>Cabinet</i>
          <i>Monument</i>
        </div>
        <small>Material</small>
        <div className={styles.sw}>
          <b style={{ background: "#c9ccd0" }} />
          <b style={{ background: "#f3f3f1" }} />
          <b style={{ background: "#2b2d30" }} />
          <span className={styles.so} />
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
