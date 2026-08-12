"use client";

import { useReducedMotion } from "framer-motion";

type PinData = {
  id: string;
  score: number;
  label: string;
  x: number;
  y: number;
  featured?: boolean;
};

const PINS: PinData[] = [
  {
    id: "hot-1",
    score: 96,
    label: "Very likely to buy",
    x: 72,
    y: 26,
    featured: true,
  },
  {
    id: "hot-2",
    score: 93,
    label: "Very likely to buy",
    x: 56,
    y: 46,
  },
  {
    id: "warm-1",
    score: 82,
    label: "Warm",
    x: 80,
    y: 64,
  },
];

function scoreBand(score: number) {
  if (score >= 90) return "#16A34A";
  if (score >= 80) return "#F59E0B";
  return "#2563EB";
}

/** Crisp SVG teardrop: white body + colored score disc. */
function ScorePinMark({
  id,
  score,
  className = "",
}: {
  id: string;
  score: number;
  className?: string;
}) {
  const ring = scoreBand(score);
  const shadowId = `heroPinShadow-${id}`;
  return (
    <svg
      viewBox="0 0 64 84"
      width="64"
      height="84"
      className={className}
      aria-hidden
    >
      <defs>
        <filter id={shadowId} x="-35%" y="-20%" width="170%" height="170%">
          <feDropShadow
            dx="0"
            dy="8"
            stdDeviation="5"
            floodColor="#000"
            floodOpacity="0.4"
          />
        </filter>
      </defs>
      <ellipse cx="32" cy="78" rx="14" ry="4" fill="#000" opacity="0.28" />
      <path
        d="M32 4C18.2 4 7 15.4 7 29.4c0 11.2 7.2 20.8 16.4 30.6 3.5 3.7 7.1 7 8.6 8.4.5.5 1.4.5 1.9 0 1.5-1.4 5.1-4.7 8.6-8.4C49.8 50.2 57 40.6 57 29.4 57 15.4 45.8 4 32 4z"
        fill="#FFFFFF"
        filter={`url(#${shadowId})`}
      />
      <circle cx="32" cy="28" r="16" fill={ring} />
      <circle cx="32" cy="28" r="16" fill="#fff" opacity="0.12" />
      <text
        x="32"
        y="28.5"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#FFFFFF"
        fontSize="15"
        fontWeight="800"
        fontFamily="Satoshi, ui-sans-serif, system-ui, sans-serif"
        letterSpacing="-0.03em"
      >
        {score}
      </text>
    </svg>
  );
}

function PinBadge({
  pin,
  index,
  reduce,
  size = "md",
}: {
  pin: PinData;
  index: number;
  reduce: boolean | null;
  size?: "md" | "lg";
}) {
  const hot = pin.score >= 90;
  return (
    <div
      className="flex flex-col items-center"
      style={
        reduce
          ? undefined
          : {
              animation: `pc-hero-pin-in 0.55s cubic-bezier(0.22,1.15,0.36,1) ${0.25 + index * 0.14}s both, pc-hero-pin-float 3.4s ease-in-out ${0.9 + index * 0.2}s infinite`,
            }
      }
    >
      <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0B1224]/88 px-3 py-1.5 text-[11px] font-bold tracking-wide text-white shadow-[0_10px_28px_rgba(0,0,0,0.45)] backdrop-blur-md sm:text-xs">
        {hot ? <span aria-hidden>🔥</span> : null}
        {pin.label}
      </span>
      <ScorePinMark
        id={`${pin.id}-${size}`}
        score={pin.score}
        className={
          size === "lg" ? "h-[4.75rem] w-[3.6rem]" : "h-16 w-12 sm:h-[4.5rem] sm:w-14"
        }
      />
    </div>
  );
}

/**
 * Floating score pins over the hero city photo.
 * variant="mobile" → one featured pin in flow
 * variant="desktop" → absolute cluster
 */
export function HeroScorePins({
  variant = "desktop",
}: {
  variant?: "mobile" | "desktop";
}) {
  const reduce = useReducedMotion();
  const featured = PINS.find((p) => p.featured) ?? PINS[0]!;

  return (
    <>
      <style>{`
        @keyframes pc-hero-pin-in {
          from { opacity: 0; transform: translateY(14px) scale(0.86); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pc-hero-pin-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pc-hero-pin-layer * { animation: none !important; }
        }
      `}</style>

      {variant === "mobile" ? (
        <div className="pc-hero-pin-layer relative z-[12] flex justify-center">
          <PinBadge pin={featured} index={0} reduce={reduce} size="lg" />
        </div>
      ) : (
        <div className="pc-hero-pin-layer pointer-events-none absolute inset-0" aria-hidden>
          {PINS.map((pin, i) => (
            <div
              key={pin.id}
              className="absolute -translate-x-1/2 -translate-y-full"
              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            >
              <PinBadge pin={pin} index={i} reduce={reduce} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/** Full-bleed city photo + brand gradient overlay. */
export function HeroCityBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/hero-city-bg.png"
        alt=""
        className="absolute inset-0 h-full w-full scale-105 object-cover object-[58%_40%] md:object-[68%_38%]"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(105deg, rgba(7,8,18,0.92) 0%, rgba(12,10,28,0.78) 28%, rgba(76,40,140,0.45) 55%, rgba(20,90,140,0.28) 78%, rgba(30,180,200,0.22) 100%), linear-gradient(180deg, rgba(7,8,18,0.45) 0%, transparent 28%, transparent 58%, rgba(7,8,18,0.55) 100%)",
        }}
      />
    </div>
  );
}

/** @deprecated alias */
export function HeroRouteMap({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 ${className}`}>
      <HeroCityBackground />
    </div>
  );
}
