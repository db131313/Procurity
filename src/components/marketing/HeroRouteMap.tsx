"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const PINS = [
  { x: 18, y: 62, score: 92, label: "Hudson Yards" },
  { x: 38, y: 48, score: 88, label: "Chelsea" },
  { x: 55, y: 36, score: 91, label: "Midtown" },
  { x: 72, y: 52, score: 84, label: "UES" },
  { x: 86, y: 40, score: 96, label: "Queens" },
] as const;

function pinColor(score: number) {
  if (score >= 90) return "#16A34A";
  if (score >= 80) return "#0D9488";
  return "#2563EB";
}

/** Isometric hero: city blocks + scored route — "here's your day, mapped out". */
export function HeroRouteMap({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setInView(true);
      },
      { threshold: 0.25 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`relative mx-auto w-full max-w-lg ${className}`}
      onMouseMove={(e) => {
        if (reduce) return;
        const r = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width - 0.5) * 12;
        const y = ((e.clientY - r.top) / r.height - 0.5) * 8;
        setParallax({ x, y });
      }}
      onMouseLeave={() => setParallax({ x: 0, y: 0 })}
    >
      <motion.div
        className="relative aspect-[5/4] overflow-hidden rounded-[28px] border border-white/10 bg-[#0B0F19] shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
        style={{
          transform: reduce
            ? undefined
            : `perspective(900px) rotateX(${8 + parallax.y * 0.15}deg) rotateY(${parallax.x * 0.2}deg)`,
        }}
      >
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(ellipse at 70% 20%, rgba(124,108,246,0.35), transparent 45%), radial-gradient(ellipse at 20% 80%, rgba(56,217,201,0.2), transparent 40%), linear-gradient(165deg,#0B0F19,#151b2c 50%,#0f1a22)",
          }}
        />

        {/* Isometric grid of buildings */}
        <svg
          viewBox="0 0 500 400"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          <defs>
            <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7C6CF6" />
              <stop offset="100%" stopColor="#38D9C9" />
            </linearGradient>
          </defs>

          {/* Ground plane */}
          <g opacity="0.55" transform="translate(40,80)">
            {[0, 1, 2, 3, 4, 5].map((row) =>
              [0, 1, 2, 3, 4, 5, 6].map((col) => {
                const x = col * 52 + row * 18;
                const y = row * 36;
                const h = 28 + ((col * 17 + row * 11) % 55);
                return (
                  <g key={`${row}-${col}`}>
                    <polygon
                      points={`${x},${y} ${x + 36},${y - 14} ${x + 36},${y - 14 - h} ${x},${y - h}`}
                      fill={col % 2 === 0 ? "#1c2438" : "#232c42"}
                    />
                    <polygon
                      points={`${x + 36},${y - 14} ${x + 52},${y} ${x + 52},${y - h} ${x + 36},${y - 14 - h}`}
                      fill="#121826"
                    />
                    <polygon
                      points={`${x},${y - h} ${x + 36},${y - 14 - h} ${x + 52},${y - h} ${x + 16},${y + 14 - h}`}
                      fill="#2a3348"
                      opacity="0.9"
                    />
                  </g>
                );
              }),
            )}
          </g>

          {/* Route path */}
          <motion.path
            d="M 90 248 C 140 210, 180 200, 210 190 S 280 150, 310 160 S 360 200, 400 180 S 440 150, 460 155"
            fill="none"
            stroke="url(#routeGrad)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="8 10"
            initial={reduce ? false : { pathLength: 0, opacity: 0 }}
            animate={
              inView || reduce
                ? { pathLength: 1, opacity: 1 }
                : { pathLength: 0, opacity: 0 }
            }
            transition={{ duration: reduce ? 0 : 1.6, ease: "easeInOut" }}
          />

          {/* Pins */}
          {PINS.map((pin, i) => (
            <motion.g
              key={pin.label}
              initial={reduce ? false : { opacity: 0, y: 12, scale: 0.6 }}
              animate={
                inView || reduce
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0, y: 12, scale: 0.6 }
              }
              transition={{
                delay: reduce ? 0 : 0.35 + i * 0.18,
                type: "spring",
                stiffness: 420,
                damping: 18,
              }}
            >
              <circle
                cx={`${pin.x}%`}
                cy={`${pin.y}%`}
                r="16"
                fill={pinColor(pin.score)}
                stroke="#fff"
                strokeWidth="3"
              />
              <text
                x={`${pin.x}%`}
                y={`${pin.y}%`}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#fff"
                fontSize="11"
                fontWeight="800"
                fontFamily="Satoshi, sans-serif"
              >
                {pin.score}
              </text>
            </motion.g>
          ))}
        </svg>

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
          <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/80 backdrop-blur">
            Today&apos;s route
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold text-teal backdrop-blur">
            5 stops · peak window
          </span>
        </div>
      </motion.div>
    </div>
  );
}
