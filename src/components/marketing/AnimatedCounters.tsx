"use client";

import { useEffect, useRef, useState } from "react";

const STATS = [
  { label: "Score accuracy claim", value: 92, suffix: "%", prefix: "" },
  { label: "Avg. buying window", value: 3, suffix: " wks", prefix: "" },
  { label: "Field hours saved / wk", value: 8, suffix: "+", prefix: "" },
];

function useInView(ref: React.RefObject<HTMLElement | null>) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setVisible(true);
      },
      { threshold: 0.35 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref]);
  return visible;
}

export function AnimatedCounters() {
  const ref = useRef<HTMLElement>(null);
  const visible = useInView(ref);
  const [vals, setVals] = useState(STATS.map(() => 0));

  useEffect(() => {
    if (!visible) return;
    const start = performance.now();
    const duration = 1100;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVals(STATS.map((s) => Math.round(s.value * eased)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible]);

  return (
    <section
      ref={ref}
      className="pc-gradient-bg px-5 py-14 text-white md:px-10 md:py-16"
    >
      <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-3">
        {STATS.map((s, i) => (
          <div key={s.label} className="text-center">
            <p className="text-4xl font-bold tabular-nums md:text-5xl">
              {s.prefix}
              {vals[i]}
              {s.suffix}
            </p>
            <p className="mt-2 text-sm font-semibold text-white/80">{s.label}</p>
          </div>
        ))}
      </div>
      {/* PLACEHOLDER STATS — replace with verified metrics */}
    </section>
  );
}
