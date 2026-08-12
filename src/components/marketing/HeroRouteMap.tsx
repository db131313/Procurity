"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

type Pin = {
  id: string;
  x: number; // % of map width
  y: number; // % of map height
  score: number;
  label: string;
  mobile?: boolean; // shown on mobile
};

const PINS: Pin[] = [
  { id: "a", x: 16, y: 68, score: 92, label: "Hudson Yards", mobile: true },
  { id: "b", x: 34, y: 52, score: 88, label: "Chelsea", mobile: true },
  { id: "c", x: 52, y: 38, score: 91, label: "Midtown", mobile: true },
  { id: "d", x: 70, y: 56, score: 84, label: "Upper East", mobile: false },
  { id: "e", x: 86, y: 42, score: 96, label: "Long Island City", mobile: true },
];

function pinFill(score: number) {
  if (score >= 90) return { head: "#16A34A", ring: "#86EFAC" };
  if (score >= 80) return { head: "#0D9488", ring: "#5EEAD4" };
  return { head: "#2563EB", ring: "#93C5FD" };
}

/** Smooth teardrop map pin — vector, crisp at any DPR. */
function MapPinMark({
  id,
  score,
  className = "",
}: {
  id: string;
  score: number;
  className?: string;
}) {
  const { head, ring } = pinFill(score);
  const shadowId = `pinShadow-${id}`;
  const glossId = `pinGloss-${id}`;
  return (
    <svg
      viewBox="0 0 56 72"
      className={className}
      width="56"
      height="72"
      aria-hidden
    >
      <defs>
        <filter id={shadowId} x="-40%" y="-20%" width="180%" height="180%">
          <feDropShadow
            dx="0"
            dy="6"
            stdDeviation="4"
            floodColor="#000"
            floodOpacity="0.35"
          />
        </filter>
        <linearGradient id={glossId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <ellipse cx="28" cy="66" rx="12" ry="3.5" fill="#000" opacity="0.22" />
      <path
        d="M28 2C15.3 2 5 12.4 5 25.2c0 9.6 6.1 18.2 14.6 27.3 3.4 3.6 6.9 6.8 8.4 8.2.5.5 1.3.5 1.8 0 1.5-1.4 5-4.6 8.4-8.2C46.9 43.4 53 34.8 53 25.2 53 12.4 42.7 2 28 2z"
        fill={head}
        filter={`url(#${shadowId})`}
      />
      <circle cx="28" cy="24" r="15.5" fill="#0B0F19" opacity="0.18" />
      <circle cx="28" cy="24" r="13.5" fill="#fff" />
      <circle cx="28" cy="24" r="13.5" fill={`url(#${glossId})`} />
      <circle
        cx="28"
        cy="24"
        r="13.5"
        fill="none"
        stroke={ring}
        strokeWidth="2.25"
      />
      <text
        x="28"
        y="24.5"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#0B0F19"
        fontSize="13"
        fontWeight="800"
        fontFamily="Satoshi, ui-sans-serif, system-ui, sans-serif"
        letterSpacing="-0.02em"
      >
        {score}
      </text>
    </svg>
  );
}

function FloatingPin({
  pin,
  index,
  visible,
  reduce,
}: {
  pin: Pin;
  index: number;
  visible: boolean;
  reduce: boolean | null;
}) {
  return (
    <motion.div
      className="absolute z-20 -translate-x-1/2 -translate-y-full"
      style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
      initial={reduce ? false : { opacity: 0, y: 18, scale: 0.7 }}
      animate={
        visible || reduce
          ? { opacity: 1, y: 0, scale: 1 }
          : { opacity: 0, y: 18, scale: 0.7 }
      }
      transition={{
        delay: reduce ? 0 : 0.45 + index * 0.16,
        type: "spring",
        stiffness: 420,
        damping: 18,
      }}
    >
      {/* Label floating above pin */}
      <motion.div
        className="mb-1.5 flex justify-center"
        animate={
          reduce
            ? undefined
            : {
                y: [0, -3, 0],
              }
        }
        transition={{
          duration: 3.2 + index * 0.25,
          repeat: Infinity,
          ease: "easeInOut",
          delay: index * 0.2,
        }}
      >
        <span className="whitespace-nowrap rounded-full border border-white/15 bg-[#0B0F19]/85 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md sm:text-xs">
          {pin.label}
        </span>
      </motion.div>
      <div className="flex justify-center">
        <MapPinMark
          id={pin.id}
          score={pin.score}
          className="h-12 w-9 drop-shadow-sm sm:h-14 sm:w-11"
        />
      </div>
    </motion.div>
  );
}

/** Full-bleed hero map: route + scored pins with floating labels. */
export function HeroRouteMap({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setInView(true);
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const pins = useMemo(
    () => (isMobile ? PINS.filter((p) => p.mobile) : PINS),
    [isMobile],
  );

  const pathD = isMobile
    ? "M 80 272 C 140 220, 180 210, 210 198 S 280 150, 310 155 S 380 175, 430 168"
    : "M 80 272 C 140 220, 180 210, 210 198 S 280 150, 310 155 S 360 210, 400 188 S 440 155, 460 160";

  return (
    <div
      ref={ref}
      className={`absolute inset-0 overflow-hidden ${className}`}
      onMouseMove={(e) => {
        if (reduce) return;
        const r = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width - 0.5) * 18;
        const y = ((e.clientY - r.top) / r.height - 0.5) * 12;
        setParallax({ x, y });
      }}
      onMouseLeave={() => setParallax({ x: 0, y: 0 })}
      aria-hidden
    >
      {/* Atmosphere */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 72% 18%, rgba(124,108,246,0.38), transparent 42%), radial-gradient(ellipse at 18% 78%, rgba(56,217,201,0.22), transparent 40%), linear-gradient(165deg,#070a12 0%,#121826 48%,#0B0F19 100%)",
        }}
      />

      <motion.div
        className="absolute inset-[-4%] h-[108%] w-[108%]"
        style={{
          transform: reduce
            ? undefined
            : `translate3d(${parallax.x}px, ${parallax.y}px, 0) perspective(1200px) rotateX(${6 + parallax.y * 0.08}deg) rotateY(${parallax.x * 0.1}deg)`,
          transformOrigin: "60% 55%",
        }}
      >
        <svg
          viewBox="0 0 500 400"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="heroRouteGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7C6CF6" />
              <stop offset="55%" stopColor="#4F9CF8" />
              <stop offset="100%" stopColor="#38D9C9" />
            </linearGradient>
            <linearGradient id="bldgTop" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3a4560" />
              <stop offset="100%" stopColor="#232c42" />
            </linearGradient>
            <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Distant skyline silhouette */}
          <g opacity="0.35" fill="#1a2236">
            <rect x="20" y="90" width="28" height="160" rx="2" />
            <rect x="56" y="60" width="40" height="190" rx="2" />
            <rect x="104" y="110" width="24" height="140" rx="2" />
            <rect x="140" y="40" width="52" height="210" rx="2" />
            <rect x="202" y="80" width="34" height="170" rx="2" />
            <rect x="250" y="30" width="64" height="220" rx="2" />
            <rect x="326" y="70" width="38" height="180" rx="2" />
            <rect x="376" y="48" width="58" height="202" rx="2" />
            <rect x="444" y="95" width="36" height="155" rx="2" />
          </g>

          {/* Isometric city blocks */}
          <g opacity="0.72" transform="translate(18,95)">
            {[0, 1, 2, 3, 4, 5].map((row) =>
              [0, 1, 2, 3, 4, 5, 6, 7].map((col) => {
                if (isMobile && (col > 5 || row > 4)) return null;
                const x = col * 54 + row * 16;
                const y = row * 34;
                const h = 22 + ((col * 19 + row * 13) % 58);
                const lit = (col + row) % 5 === 0;
                return (
                  <g key={`${row}-${col}`}>
                    <polygon
                      points={`${x},${y} ${x + 34},${y - 13} ${x + 34},${y - 13 - h} ${x},${y - h}`}
                      fill={col % 2 === 0 ? "#1c2438" : "#242e44"}
                    />
                    <polygon
                      points={`${x + 34},${y - 13} ${x + 50},${y} ${x + 50},${y - h} ${x + 34},${y - 13 - h}`}
                      fill="#101826"
                    />
                    <polygon
                      points={`${x},${y - h} ${x + 34},${y - 13 - h} ${x + 50},${y - h} ${x + 16},${y + 13 - h}`}
                      fill="url(#bldgTop)"
                      opacity="0.95"
                    />
                    {lit && (
                      <rect
                        x={x + 10}
                        y={y - h + 18}
                        width="6"
                        height="8"
                        rx="1"
                        fill="#38D9C9"
                        opacity="0.55"
                      />
                    )}
                  </g>
                );
              }),
            )}
          </g>

          {/* Soft road plane */}
          <path
            d="M 40 300 Q 180 240 280 250 T 480 210"
            fill="none"
            stroke="#1e293b"
            strokeWidth="28"
            opacity="0.45"
            strokeLinecap="round"
          />

          {/* Animated route */}
          <motion.path
            d={pathD}
            fill="none"
            stroke="url(#heroRouteGrad)"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#routeGlow)"
            strokeDasharray="10 12"
            initial={reduce ? false : { pathLength: 0, opacity: 0 }}
            animate={
              inView || reduce
                ? { pathLength: 1, opacity: 1 }
                : { pathLength: 0, opacity: 0 }
            }
            transition={{ duration: reduce ? 0 : 1.7, ease: "easeInOut" }}
          />
        </svg>

        {/* Crisp HTML/SVG pins + floating labels */}
        {pins.map((pin, i) => (
          <FloatingPin
            key={pin.id}
            pin={pin}
            index={i}
            visible={inView}
            reduce={reduce}
          />
        ))}
      </motion.div>

      {/* Readability scrims — left/bottom for copy, keep map dominant */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(7,10,18,0.88) 0%, rgba(7,10,18,0.55) 38%, rgba(7,10,18,0.15) 62%, rgba(7,10,18,0.35) 100%), linear-gradient(180deg, rgba(7,10,18,0.55) 0%, transparent 28%, transparent 55%, rgba(7,10,18,0.75) 100%)",
        }}
      />
    </div>
  );
}
