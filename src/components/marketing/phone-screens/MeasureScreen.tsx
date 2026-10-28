import styles from "../FeatureCarousel.module.css";
import { StatusBar } from "./StatusBar";

type Props = {
  poster: string;
};

export function MeasureScreen({ poster }: Props) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.cam} src={poster} alt="" />
      <StatusBar />
      <div className={styles.hud}>
        <em>LiDAR</em>
        <em>4.2 m</em>
      </div>
      <div className={styles.scan} aria-hidden />
      <svg className={styles.ms} viewBox="0 0 390 844" aria-hidden>
        <g stroke="#fff" strokeWidth="2" fill="none">
          <path className={styles.h} pathLength={1} d="M96 330H292" />
          <path className={`${styles.tk} ${styles.t1}`} d="M96 318v24M292 318v24" />
          <path className={styles.v} pathLength={1} d="M326 250V560" />
          <path
            className={`${styles.tk} ${styles.t2}`}
            d="M314 250h24M314 560h24"
          />
        </g>
      </svg>
      <span className={`${styles.ml} ${styles.mla}`} style={{ left: 150, top: 292 }}>
        14′ 2″
      </span>
      <span
        className={`${styles.ml} ${styles.mlb}`}
        style={{ left: 336, top: 395, marginLeft: -72 }}
      >
        9′ 6″
      </span>
      <div className={styles.ret} aria-hidden />
      <div className={styles.shut}>
        <span />
      </div>
      <div className={`${styles.savep} ${styles.press}`}>
        <span className={styles.a1}>Save measurement</span>
        <span className={styles.ok}>Saved</span>
      </div>
    </>
  );
}
