import type { CSSProperties } from "react";
import styles from "../FeatureCarousel.module.css";
import { StatusBar } from "./StatusBar";

const LINES = [
  { label: "Channel letters, 24 ft", amount: "$3,600" },
  { label: "Install, 2 techs", amount: "$720" },
  { label: "Permit handling", amount: "$300" },
  { label: "Tax", amount: "$200" },
];

export function QuoteScreen() {
  return (
    <div className={styles.qB}>
      <StatusBar light />
      <div className={styles.doc}>
        <div className={styles.dt}>
          <b>Quote Q-1042</b>
          <small>Alder &amp; Finch</small>
        </div>
        <div className={styles.st5}>
          <span className={styles.snt}>Draft</span>
          <span className={styles.paid}>Ready</span>
        </div>
        {LINES.map((l, i) => (
          <div
            key={l.label}
            className={styles.ln}
            style={{ ["--i" as string]: i } as CSSProperties}
          >
            <span>{l.label}</span>
            <b>{l.amount}</b>
          </div>
        ))}
        <div
          className={`${styles.ln} ${styles.tt}`}
          style={{ ["--i" as string]: LINES.length } as CSSProperties}
        >
          <span>Total</span>
          <b>$4,820</b>
        </div>
      </div>
      <div className={styles.toast}>Quote sent to Alder &amp; Finch</div>
      <div className={`${styles.toast} ${styles.ap}`}>Approved by Alder &amp; Finch</div>
      <div className={`${styles.cta2} ${styles.press}`}>Send to client</div>
    </div>
  );
}
