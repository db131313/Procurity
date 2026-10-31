import type { CSSProperties } from "react";
import styles from "../FeatureCarousel.module.css";
import { StatusBar } from "./StatusBar";

const ROWS = [
  {
    label: "Contact",
    value: "Dana Reyes, Project Manager",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#0B0D0E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
      </svg>
    ),
  },
  {
    label: "Email",
    value: "bids@hartwellco.com",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#0B0D0E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M4 7l8 6 8-6" />
      </svg>
    ),
  },
  {
    label: "Phone",
    value: "(312) 555-0148",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#0B0D0E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
      </svg>
    ),
  },
  {
    label: "Address",
    value: (
      <>
        415 W Hubbard St
        <br />
        Chicago, IL 60654
      </>
    ),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#0B0D0E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    ),
  },
];

/** Site business contact card (screen id `contact`). */
export function ConnectScreen() {
  return (
    <div className={styles.cw}>
      <StatusBar light />
      <div className={styles.cc}>
        <div className={styles.ch}>
          <div className={styles.cm}>HC</div>
          <div className={styles.cn}>
            <b>
              Hartwell
              <br />
              Construction
            </b>
            <small>General contractor</small>
          </div>
          <span className={styles.vf}>Verified</span>
        </div>
        {ROWS.map((r, i) => (
          <div
            key={r.label}
            className={styles.cr}
            style={{ ["--i" as string]: i } as CSSProperties}
          >
            <i>{r.icon}</i>
            <div>
              <small>{r.label}</small>
              <b>{r.value}</b>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.pj}>
        <span className={styles.pjb}>92</span>
        <div>
          <b>Mixed-use tower</b>
          <small>Framing · $48M · 6 wks to buy</small>
        </div>
      </div>
      <div className={styles.cbar}>
        <div className={styles.cb}>Call</div>
        <div className={styles.cb}>Email</div>
        <div className={`${styles.cb} ${styles.cbp}`}>Save to job</div>
      </div>
      <div className={styles.toast}>Contact saved to your job</div>
    </div>
  );
}
