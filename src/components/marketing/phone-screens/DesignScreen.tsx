import styles from "../FeatureCarousel.module.css";
import { StatusBar } from "./StatusBar";

export function DesignScreen() {
  return (
    <>
      <StatusBar />
      <div className={styles.dh}>
        <b>Design</b>
        <div className={styles.seg}>
          <span className={styles.segOn}>2D</span>
          <span>3D</span>
        </div>
      </div>
      <div className={styles.canvas}>
        <div className={styles.fascia}>
          <span>ALDER &amp; FINCH</span>
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
        </div>
        <div className={styles.lit}>
          <span>Illuminated</span>
          <i />
        </div>
        <div className={styles.tot}>
          <span>From your price book</span>
          <b>$4,820</b>
        </div>
      </div>
    </>
  );
}
