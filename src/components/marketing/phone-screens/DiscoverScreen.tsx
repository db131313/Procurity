import styles from "../FeatureCarousel.module.css";
import { StatusBar } from "./StatusBar";

const PINS: Array<{ left: number; top: number; d: string; sel?: boolean }> = [
  { left: 90, top: 200, d: ".2s" },
  { left: 270, top: 176, d: ".35s" },
  { left: 310, top: 250, d: ".5s" },
  { left: 150, top: 290, d: ".65s" },
  { left: 215, top: 330, d: ".8s", sel: true },
  { left: 70, top: 380, d: ".95s" },
  { left: 290, top: 400, d: "1.1s" },
  { left: 130, top: 460, d: "1.25s" },
];

export function DiscoverScreen() {
  return (
    <>
      <StatusBar />
      <div className={styles.mapbg}>
        <u style={{ left: "14%", top: "26%", ["--k" as string]: 1.2 }} />
        <u style={{ left: "56%", top: "20%", ["--k" as string]: 1.5 }} />
        <u style={{ left: "40%", top: "44%", ["--k" as string]: 0.9 }} />
        <u style={{ left: "18%", top: "52%", ["--k" as string]: 1.1 }} />
        <u style={{ left: "66%", top: "46%", ["--k" as string]: 1 }} />
      </div>
      <div className={styles.pins}>
        {PINS.map((p, i) => (
          <p
            key={i}
            className={p.sel ? styles.sel : undefined}
            style={{
              left: p.left,
              top: p.top,
              ["--d" as string]: p.d,
            }}
          />
        ))}
      </div>
      <div className={styles.pill1}>Search the map</div>
      <div className={styles.sheet}>
        <div className={styles.hd}>
          <span className={styles.bd} />
          <div>
            <h4>Mixed-use tower</h4>
            <small>W Hubbard St, Chicago</small>
          </div>
        </div>
        <div className={styles.st3}>
          <div style={{ ["--i" as string]: 0 }}>
            <b>$48M</b>Value
          </div>
          <div style={{ ["--i" as string]: 1 }}>
            <b>Framing</b>Phase
          </div>
          <div style={{ ["--i" as string]: 2 }}>
            <b>6 wks</b>To buy
          </div>
        </div>
        <div className={`${styles.cta} ${styles.s1btn} ${styles.press}`}>
          Start job
        </div>
      </div>
    </>
  );
}
