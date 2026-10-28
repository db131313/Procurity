import styles from "../FeatureCarousel.module.css";
import { StatusBar } from "./StatusBar";

export function QuoteScreen() {
  return (
    <>
      <div className={styles.optA}>
        <div className={styles.otl}>Materials</div>
        <div className={styles.grid}>
          <b />
          <b />
          <b />
          <b />
          <b />
          <b />
        </div>
        <div className={styles.pick} />
        <div className={styles.opts}>
          <small>Finish</small>
          <div className={styles.chips}>
            <i className={styles.m1}>Matte</i>
            <i className={styles.m2}>Brushed</i>
            <i>Gloss</i>
          </div>
        </div>
        <div className={styles.runtot}>
          <span>Running total</span>
          <b>
            <u className={styles.v1}>$3,120</u>
            <u className={styles.v2}>$4,350</u>
            <u className={styles.v3}>$4,820</u>
          </b>
        </div>
      </div>
      <div className={styles.qB}>
        <StatusBar light />
        <div className={styles.doc}>
          <div className={styles.dt}>
            <b>Quote Q-1042</b>
            <small>Alder &amp; Finch</small>
          </div>
          <div className={styles.ln} style={{ ["--i" as string]: 0 }}>
            <span>Channel letters, 24 ft</span>
            <b>$3,600</b>
          </div>
          <div className={styles.ln} style={{ ["--i" as string]: 1 }}>
            <span>Install, 2 techs</span>
            <b>$720</b>
          </div>
          <div className={styles.ln} style={{ ["--i" as string]: 2 }}>
            <span>Permit handling</span>
            <b>$300</b>
          </div>
          <div className={styles.ln} style={{ ["--i" as string]: 3 }}>
            <span>Tax</span>
            <b>$200</b>
          </div>
          <div
            className={`${styles.ln} ${styles.tt}`}
            style={{ ["--i" as string]: 4 }}
          >
            <span>Total</span>
            <b>$4,820</b>
          </div>
        </div>
        <div className={styles.toast}>Quote sent to Alder &amp; Finch</div>
        <div className={`${styles.cta2} ${styles.press}`}>Send to client</div>
      </div>
    </>
  );
}
