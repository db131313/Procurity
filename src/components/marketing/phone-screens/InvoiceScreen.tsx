import styles from "../FeatureCarousel.module.css";
import { StatusBar } from "./StatusBar";

export function InvoiceScreen() {
  return (
    <div className={styles.lightFill}>
      <StatusBar light />
      <div className={styles.doc}>
        <div className={styles.dt}>
          <b>Invoice INV-1042</b>
          <small>Due Nov 12</small>
        </div>
        <div className={styles.amt}>$4,820.00</div>
        <div className={styles.seg2}>
          <span>Pay in full</span>
          <span className={styles.seg2On}>50% deposit</span>
        </div>
        <div className={styles.ln}>
          <span>Deposit due now</span>
          <b>$2,410</b>
        </div>
        <div className={styles.ln}>
          <span>Balance on completion</span>
          <b>$2,410</b>
        </div>
      </div>
      <div className={styles.cta2}>Send payment link</div>
    </div>
  );
}
