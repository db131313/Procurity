"use client";

import { cn } from "@/lib/cn";
import styles from "./CarouselOverlays.module.css";

type Props = {
  show: boolean;
  play: boolean;
};

/** Floating Connect cards (no phone) — company, contacts, then email compose. */
export function ConnectOverlay({ show, play }: Props) {
  return (
    <div
      className={cn(styles.cx, show && styles.cxShow, play && styles.cxPlay)}
      data-testid="car-connect-cards"
      aria-hidden={!show}
    >
      <div className={styles.cs}>
        <div className={cn(styles.co, styles.cxc, styles.cxcHd)} style={{ ["--d" as string]: ".1s" }}>
          <span className={styles.cm}>HC</span>
          <div className={styles.cn}>
            <b>Hartwell Construction</b>
            <small>General contractor</small>
          </div>
          <em className={styles.vf} style={{ fontStyle: "normal" }}>
            Verified
          </em>
        </div>
        <div className={cn(styles.co, styles.cxc)} style={{ ["--d" as string]: "0.50s" }}>
          <i>
            <svg viewBox="0 0 24 24" fill="none" stroke="#0B0D0E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
            </svg>
          </i>
          <div>
            <small>Contact</small>
            <b>Dana Reyes, Project Manager</b>
          </div>
        </div>
        <div className={cn(styles.co, styles.cxc)} style={{ ["--d" as string]: "0.90s" }}>
          <i>
            <svg viewBox="0 0 24 24" fill="none" stroke="#0B0D0E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="3" />
              <path d="M4 7l8 6 8-6" />
            </svg>
          </i>
          <div>
            <small>Email</small>
            <b>bids@hartwellco.com</b>
          </div>
        </div>
        <div className={cn(styles.co, styles.cxc)} style={{ ["--d" as string]: "1.30s" }}>
          <i>
            <svg viewBox="0 0 24 24" fill="none" stroke="#0B0D0E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
            </svg>
          </i>
          <div>
            <small>Phone</small>
            <b>(312) 555-0148</b>
          </div>
        </div>
        <div className={cn(styles.co, styles.cxc)} style={{ ["--d" as string]: "1.70s" }}>
          <i>
            <svg viewBox="0 0 24 24" fill="none" stroke="#0B0D0E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          </i>
          <div>
            <small>Address</small>
            <b>415 W Hubbard St, Chicago, IL</b>
          </div>
        </div>
        <div className={cn(styles.co, styles.cxa)} style={{ ["--d" as string]: "1.9s" }}>
          <span className={styles.cxb}>Call</span>
          <span className={cn(styles.cxb, styles.cxbEm)}>Email</span>
          <span className={cn(styles.cxb, styles.cxbP)}>Save to job</span>
        </div>
      </div>
      <div className={cn(styles.co, styles.cmp)} style={{ ["--d" as string]: "3.5s" }}>
        <div className={styles.mh}>
          New email<span>To Dana Reyes</span>
        </div>
        <div className={styles.mr}>
          <span>To</span>
          <b>bids@hartwellco.com</b>
        </div>
        <div className={styles.mr}>
          <span>Subject</span>
          <b>Signage bid: Mixed-use tower</b>
        </div>
        <div className={styles.mb}>
          <p className={styles.t1}>Hi Dana, we&apos;d like to bid the signage</p>
          <p className={styles.t2}>for the tower. Can we talk this week?</p>
        </div>
        <div className={styles.snd}>
          <u className={styles.go}>Send email</u>
          <u className={styles.ok}>✓ Sent</u>
        </div>
      </div>
    </div>
  );
}
