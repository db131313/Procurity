"use client";

import styles from "../FeatureCarousel.module.css";

const SCREW_X = [150, 190, 215, 262, 300, 340, 370];
const SCREW_Y = [110, 170, 230, 290, 350, 410, 470, 530, 590];

/** Shared AR wall POV used by Measure and Design. `uid` prefixes gradient/filter ids. */
export function CameraPov({ uid = "pcm" }: { uid?: string }) {
  const id = (x: string) => `${uid}-${x}`;
  return (
    <svg
      className={styles.cam}
      viewBox="0 0 390 844"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id={id("wl")} x1="0" x2="1">
          <stop offset="0" stopColor="#cfc7b6" />
          <stop offset=".5" stopColor="#ddd6c8" />
          <stop offset="1" stopColor="#c8c0af" />
        </linearGradient>
        <linearGradient id={id("gl")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bcd0de" />
          <stop offset=".55" stopColor="#d9dfe0" />
          <stop offset="1" stopColor="#9a9b97" />
        </linearGradient>
        <linearGradient id={id("sun")} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff6dc" stopOpacity=".5" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={id("gr")}>
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves={2} seed={3} />
          <feColorMatrix values="0 0 0 0 .5 0 0 0 0 .45 0 0 0 0 .4 0 0 0 .5 0" />
        </filter>
        <filter id={id("bl")}>
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>
      <rect width="390" height="844" fill="#2a2926" />
      <rect y="0" width="390" height="84" fill="#1d1e20" />
      <g stroke="#55585c" strokeWidth="5">
        <path d="M0 20H390M0 56H390M60 0V84M200 0V84M330 0V84" />
      </g>
      <path d="M0 84H390V650H0Z" fill={`url(#${id("wl")})`} />
      <path d="M118 84H390V650H118Z" fill="#d6cfc0" opacity=".5" />
      <path d="M238 84V650" stroke="#bdb5a3" strokeWidth="3" />
      <path d="M118 300H390" stroke="#c4bba8" strokeWidth="12" opacity=".7" />
      <path d="M118 300H390" stroke="#e4ddcf" strokeWidth="2" />
      <g fill="#6d675c" opacity=".75">
        {SCREW_X.flatMap((cx) =>
          SCREW_Y.map((cy) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.6" />),
        )}
      </g>
      <path d="M0 640H390V844H0Z" fill="#a88556" />
      <g stroke="#8e6d41" strokeWidth="2">
        <path d="M0 700H390M0 770H390M120 640L60 844M260 640L300 844" />
      </g>
      <path d="M30 780h40M50 800h60" stroke="#6d5a3a" strokeWidth="3" opacity=".6" />
      <path d="M0 560H138V650H0Z" fill="#cbc3b2" />
      <path d="M0 560H138" stroke="#b3ab99" strokeWidth="3" />
      <g>
        <rect x="-10" y="150" width="140" height="420" fill="#c1935a" />
        <rect x="8" y="168" width="104" height="384" fill={`url(#${id("gl")})`} />
        <g filter={`url(#${id("bl")})`}>
          <rect x="8" y="168" width="104" height="250" fill="#b8c6cf" />
          <rect x="14" y="190" width="40" height="230" fill="#c9c4b8" />
          <rect x="62" y="210" width="44" height="210" fill="#b4b0a6" />
          <g fill="#8fa3b3">
            <rect x="20" y="206" width="8" height="12" />
            <rect x="34" y="206" width="8" height="12" />
            <rect x="20" y="236" width="8" height="12" />
            <rect x="34" y="236" width="8" height="12" />
            <rect x="70" y="226" width="8" height="12" />
            <rect x="86" y="226" width="8" height="12" />
          </g>
          <rect x="8" y="420" width="104" height="132" fill="#9b9c98" />
          <rect x="18" y="470" width="54" height="22" rx="6" fill="#e9b834" />
          <rect x="82" y="440" width="12" height="40" fill="#5b5e63" />
        </g>
        <path d="M8 168H112V552H8Z" fill="none" stroke="#9a6f3c" strokeWidth="3" />
      </g>
      <path d="M118 84V650" stroke="#8a6a3d" strokeWidth="3" opacity=".5" />
      <path
        d="M170 84L390 330V84Z"
        fill={`url(#${id("sun")})`}
        opacity=".7"
        transform="translate(-20 230)"
      />
      <path d="M150 330L350 560L370 540L170 320Z" fill="#fff6dc" opacity=".22" />
      <rect width="390" height="844" filter={`url(#${id("gr")})`} opacity=".35" />
      <rect width="390" height="844" fill="#000" opacity=".12" />
    </svg>
  );
}
