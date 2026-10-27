"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import styles from "./PhoneTour.module.css";

const STEPS = [
  {
    title: "Discover",
    body: "See every commercial build near you, scored by how soon it will buy. Tap one to start a job.",
  },
  {
    title: "Measure",
    body: "Scan the site with your iPhone. LiDAR gives you real dimensions in seconds, saved straight to the job.",
  },
  {
    title: "Design",
    body: "Pick the sign type, material and color. Prices come from your own supplier price list, so the number is real.",
  },
  {
    title: "Quote",
    body: "One tap turns the design into a branded quote your client can approve.",
  },
  {
    title: "Invoice",
    body: "When they approve, bill the full amount or a 50% deposit and send a payment link. Everything is packaged for your head office.",
  },
] as const;

function StatusBar({ light }: { light?: boolean }) {
  return (
    <div className={cn(styles.sbar, light && styles.light)}>
      <b>9:41</b>
      <span />
    </div>
  );
}

function ScreenDiscover() {
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

function ScreenMeasure({ bgSrc }: { bgSrc: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={bgSrc} alt="" />
      <StatusBar />
      <div className={styles.hud}>
        <em>LiDAR</em>
        <em>4.2 m</em>
      </div>
      <div className={styles.scan} aria-hidden />
      <svg className={styles.ms} viewBox="0 0 390 844" aria-hidden>
        <g stroke="#fff" strokeWidth="2" fill="none">
          <path d="M96 330H292" />
          <path d="M96 318v24M292 318v24" />
          <path d="M326 250V560" />
          <path d="M314 250h24M314 560h24" />
        </g>
      </svg>
      <span className={styles.ml} style={{ left: 150, top: 292 }}>
        14′ 2″
      </span>
      <span
        className={styles.ml}
        style={{
          left: 336,
          top: 395,
          transform: "translateX(-100%) translateX(-12px)",
        }}
      >
        9′ 6″
      </span>
      <div className={styles.shut}>
        <span />
      </div>
      <div className={styles.savep}>Save measurement</div>
    </>
  );
}

function ScreenDesign() {
  return (
    <>
      <StatusBar />
      <div className={styles.dh}>
        <b>Design</b>
        <div className={styles.seg}>
          <span className={styles.segOn}>2D</span>
          <span>3D</span>
        </div>
      </div>
      <div className={styles.canvas}>
        <div className={styles.fascia}>
          <span>ALDER &amp; FINCH</span>
        </div>
        <div className={styles.dim}>12′ × 2′</div>
      </div>
      <div className={styles.panel}>
        <small>Type</small>
        <div className={styles.chips}>
          <i className={styles.chipOn}>Channel letters</i>
          <i>Cabinet</i>
          <i>Monument</i>
        </div>
        <small>Material</small>
        <div className={styles.sw}>
          <b style={{ background: "#c9ccd0" }} />
          <b style={{ background: "#f3f3f1" }} />
          <b style={{ background: "#2b2d30" }} />
        </div>
        <div className={styles.lit}>
          <span>Illuminated</span>
          <i />
        </div>
        <div className={styles.tot}>
          <span>From your price book</span>
          <b>$4,820</b>
        </div>
      </div>
    </>
  );
}

function ScreenQuote() {
  return (
    <div className={styles.light} style={{ position: "absolute", inset: 0 }}>
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

function ScreenInvoice() {
  return (
    <div className={styles.light} style={{ position: "absolute", inset: 0 }}>
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

const SCREENS: Array<{
  key: string;
  /** Swap this for a real screenshot later */
  render: (props: { measureBg: string }) => ReactNode;
}> = [
  { key: "discover", render: () => <ScreenDiscover /> },
  {
    key: "measure",
    render: ({ measureBg }) => <ScreenMeasure bgSrc={measureBg} />,
  },
  { key: "design", render: () => <ScreenDesign /> },
  { key: "quote", render: () => <ScreenQuote /> },
  { key: "invoice", render: () => <ScreenInvoice /> },
];

export function PhoneTour({
  measureBg = "/home/field-3.jpg",
}: {
  measureBg?: string;
}) {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const iosUrl = process.env.NEXT_PUBLIC_IOS_APP_URL?.trim() || "";

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes = stepRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!nodes.length) return;

    if (reduced) {
      // Keep first step highlighted; no auto cross-fade driven by scroll.
      setActive(0);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const idx = Number((visible.target as HTMLElement).dataset.i);
        if (!Number.isNaN(idx)) setActive(idx);
      },
      { root: null, threshold: [0.35, 0.55, 0.7], rootMargin: "-20% 0px -35% 0px" },
    );
    for (const n of nodes) io.observe(n);
    return () => io.disconnect();
  }, []);

  return (
    <section className={styles.tour} id="tour" data-testid="phone-tour">
      <div className={styles.tw}>
        <div className={styles.tl}>
          <div className={styles.phwrap}>
            <div className={styles.ph} aria-hidden={false}>
              <i className={styles.sb1} />
              <i className={styles.sb2} />
              <i className={styles.sb3} />
              <div className={styles.scr}>
                <div className={styles.scale}>
                  {SCREENS.map((screen, i) => (
                    <div
                      key={screen.key}
                      className={cn(styles.sc, active === i && styles.scOn)}
                      data-i={i}
                      data-testid={`tour-screen-${screen.key}`}
                      aria-hidden={active !== i}
                      // Hidden screens must not be tabbable
                      inert={active !== i ? true : undefined}
                    >
                      {screen.render({ measureBg })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className={styles.soon}>
              {iosUrl ? (
                <Link href={iosUrl} className="underline hover:text-white">
                  Download on the App Store
                </Link>
              ) : (
                "iPhone app coming soon to the App Store"
              )}
            </p>
          </div>
        </div>

        <div className={styles.tr}>
          <h2>One app, from the first look to the final payment.</h2>
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              ref={(el) => {
                stepRefs.current[i] = el;
              }}
              className={cn(styles.stp, active === i && styles.stpOn)}
              data-i={i}
              data-testid={`tour-step-${i}`}
            >
              <b>{step.title}</b>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
