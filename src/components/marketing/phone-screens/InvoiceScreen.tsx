import styles from "../FeatureCarousel.module.css";
import { StatusBar } from "./StatusBar";

export function InvoiceScreen() {
  return (
    <div className={styles.s5}>
      <StatusBar light />
      <div className={styles.doc}>
        <div className={styles.dt}>
          <b>Invoice INV-1042</b>
          <small>Due Nov 12</small>
        </div>
        <div className={styles.st5}>
          <span className={styles.snt}>Sent</span>
          <span className={styles.paid}>Paid</span>
        </div>
        <div className={styles.amt}>$4,820.00</div>
        <div className={styles.seg2}>
          <span>Pay in full</span>
          <span className={styles.seg2On}>50% deposit</span>
        </div>
        <div className={styles.dep}>
          <span>Deposit due now</span>
          <b>
            <i className={styles.chk} />
            $2,410
          </b>
        </div>
        <div className={styles.dep}>
          <span>Balance on completion</span>
          <b>$2,410</b>
        </div>
      </div>
      <div className={styles.rcv}>
        <i>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0B0D0E"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path pathLength={1} d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </i>
        <div>
          <b>Deposit received</b>
          <small>$2,410 from Alder &amp; Finch</small>
        </div>
      </div>
      <div className={`${styles.toast} ${styles.t1}`}>Payment link sent</div>
      <div className={`${styles.cta2} ${styles.press}`}>Send payment link</div>
    </div>
  );
}
