import styles from "../FeatureCarousel.module.css";
import { StatusBar } from "./StatusBar";

export function DiscoverScreen() {
  return (
    <>
      <StatusBar />
      <div className={styles.mapbg}>
        <u style={{ left: "22%", top: "30%", ["--s" as string]: 1 }} />
        <u style={{ left: "64%", top: "24%", ["--s" as string]: 1.4 }} />
        <u style={{ left: "48%", top: "46%", ["--s" as string]: 0.8 }} />
        <u style={{ left: "30%", top: "58%", ["--s" as string]: 1.1 }} />
        <u style={{ left: "72%", top: "52%", ["--s" as string]: 0.9 }} />
      </div>
      <div className={styles.pill1}>Search the map</div>
      <div className={styles.sheet}>
        <div className={styles.hd}>
          <span className={styles.bd}>92</span>
          <div>
            <h4>Mixed-use tower</h4>
            <small>W Hubbard St, Chicago</small>
          </div>
        </div>
        <div className={styles.st3}>
          <div>
            <b>$48M</b>Value
          </div>
          <div>
            <b>Framing</b>Phase
          </div>
          <div>
            <b>6 wks</b>To buy
          </div>
        </div>
        <div className={styles.cta}>Start job</div>
      </div>
    </>
  );
}
