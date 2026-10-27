import { cn } from "@/lib/cn";
import styles from "../FeatureCarousel.module.css";
import { StatusBar } from "./StatusBar";

export function QuoteScreen() {
  return (
    <div className={styles.lightFill}>
      <StatusBar light />
      <div className={styles.doc}>
        <div className={styles.dt}>
          <b>Quote Q-1042</b>
          <small>Alder &amp; Finch</small>
        </div>
        <div className={styles.ln}>
          <span>Channel letters, 24 ft</span>
          <b>$3,600</b>
        </div>
        <div className={styles.ln}>
          <span>Install, 2 techs</span>
          <b>$720</b>
        </div>
        <div className={styles.ln}>
          <span>Permit handling</span>
          <b>$300</b>
        </div>
        <div className={styles.ln}>
          <span>Tax</span>
          <b>$200</b>
        </div>
        <div className={cn(styles.ln, styles.lnTot)}>
          <span>Total</span>
          <b>$4,820</b>
        </div>
      </div>
      <div className={styles.cta2}>Send to client</div>
    </div>
  );
}
