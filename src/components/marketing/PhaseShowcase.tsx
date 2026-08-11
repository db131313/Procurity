"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";

const PHASES = [
  {
    id: "foundation",
    label: "Foundation / Structure",
    blurb: "Excavation and slab — early signal for large commercial jobs.",
    accent: false,
  },
  {
    id: "framing",
    label: "Structure / Framing",
    blurb: "Steel and floors rise. Track scale before the finish window.",
    accent: false,
  },
  {
    id: "mep",
    label: "MEP / Rough-In",
    blurb: "Systems go in. Procurement conversations start warming up.",
    accent: false,
  },
  {
    id: "finishing",
    label: "Interior Finishing",
    blurb: "Highest signage-buy probability — walls up, interiors glowing.",
    accent: true,
  },
  {
    id: "signready",
    label: "Sign-Ready / Near CO",
    blurb: "Blank fascia lights up. Time to place the mark.",
    accent: true,
  },
] as const;

function Diorama({ phaseId, accent }: { phaseId: string; accent: boolean }) {
  const reduce = useReducedMotion();
  const loop = reduce ? undefined : { repeat: Infinity, ease: "easeInOut" as const };

  return (
    <div
      className={cn(
        "relative mx-auto aspect-[4/3] w-full max-w-[280px] overflow-hidden rounded-[22px]",
        accent
          ? "bg-gradient-to-br from-[#121826] via-[#1a2236] to-[#0f3d3a]"
          : "bg-gradient-to-br from-[#141824] via-[#1c2438] to-[#15202e]",
      )}
    >
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 70% 20%, rgba(124,108,246,0.35), transparent 40%), radial-gradient(circle at 30% 80%, rgba(56,217,201,0.25), transparent 45%)",
        }}
      />
      <div
        className="absolute inset-0 flex items-end justify-center pb-6"
        style={{ perspective: "600px" }}
      >
        <motion.div
          className="relative h-[150px] w-[180px]"
          style={{ transformStyle: "preserve-3d", transform: "rotateX(52deg) rotateZ(-32deg)" }}
          animate={reduce ? undefined : { rotateZ: [-32, -28, -32] }}
          transition={{ duration: 8, ...loop }}
        >
          <div className="absolute left-1/2 top-1/2 h-[120px] w-[160px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[#2a3348]/70" />

          {phaseId === "foundation" && (
            <>
              <div className="absolute left-[40px] top-[50px] h-[18px] w-[100px] rounded bg-[#3d465c]" />
              <div className="absolute left-[50px] top-[40px] h-[10px] w-[80px] rounded bg-[#5b6478]" />
              <motion.div
                className="absolute left-[120px] top-[10px] h-[70px] w-[6px] origin-bottom rounded bg-[#94a3b8]"
                animate={reduce ? undefined : { rotate: [-8, 10, -8] }}
                transition={{ duration: 3.2, ...loop }}
              />
              <motion.div
                className="absolute left-[100px] top-[8px] h-[6px] w-[40px] origin-left rounded bg-[#38d9c9]/80"
                animate={reduce ? undefined : { rotate: [-12, 18, -12] }}
                transition={{ duration: 3.2, ...loop }}
              />
              {!reduce && (
                <motion.div
                  className="absolute left-[70px] top-[45px] h-2 w-2 rounded-full bg-[#cbd5e1]/40"
                  animate={{ y: [0, 10, 0], opacity: [0.2, 0.7, 0.2] }}
                  transition={{ duration: 2.4, repeat: Infinity }}
                />
              )}
            </>
          )}
          {phaseId === "framing" && (
            <>
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-sm bg-[#8b93a7]"
                  style={{
                    left: 40 + i * 22,
                    top: 20 + (3 - i) * 6,
                    width: 16,
                    height: 70 + i * 8,
                    opacity: 0.85,
                  }}
                  animate={reduce ? undefined : { y: [6, 0, 0], opacity: [0.3, 0.85, 0.85] }}
                  transition={{ duration: 2.8, delay: i * 0.35, ...loop }}
                />
              ))}
              <motion.div
                className="absolute left-[130px] top-[0px] h-[90px] w-[5px] origin-bottom rounded bg-[#38d9c9]/70"
                animate={reduce ? undefined : { rotate: [-15, 12, -15] }}
                transition={{ duration: 4, ...loop }}
              />
            </>
          )}
          {phaseId === "mep" && (
            <>
              <div className="absolute left-[48px] top-[18px] h-[100px] w-[90px] rounded-md bg-[#6b7288]" />
              <motion.div
                className="absolute left-[54px] top-[28px] h-[80px] w-[78px] rounded-sm border border-[#38d9c9]/40 bg-[#38d9c9]/10"
                animate={reduce ? undefined : { opacity: [0.25, 0.7, 0.25] }}
                transition={{ duration: 2.2, ...loop }}
              />
              <div className="absolute left-[40px] top-[30px] h-[90px] w-[8px] rounded bg-[#94a3b8]/50" />
              <motion.div
                className="absolute left-[36px] top-[20px] h-[100px] w-[4px] rounded bg-white/20"
                animate={reduce ? undefined : { x: [0, 4, 0] }}
                transition={{ duration: 2.6, ...loop }}
              />
            </>
          )}
          {phaseId === "finishing" && (
            <>
              <div className="absolute left-[48px] top-[12px] h-[110px] w-[95px] rounded-md bg-[#7c6cf6]/40" />
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute h-[14px] w-[18px] rounded-sm bg-[#fbbf24]/50"
                  style={{ left: 64 + i * 22, top: 40 + (i % 2) * 16 }}
                  animate={
                    reduce
                      ? undefined
                      : { opacity: [0.15, 1, 0.15], boxShadow: ["0 0 0px #fbbf24", "0 0 14px #fbbf24", "0 0 0px #fbbf24"] }
                  }
                  transition={{ duration: 2.4, delay: i * 0.4, ...loop }}
                />
              ))}
              <motion.div
                className="absolute left-[56px] top-[28px] h-[70px] w-[78px] rounded-sm bg-[#fbbf24]/20"
                animate={reduce ? undefined : { opacity: [0.2, 0.55, 0.2] }}
                transition={{ duration: 3, ...loop }}
              />
            </>
          )}
          {phaseId === "signready" && (
            <>
              <div className="absolute left-[48px] top-[8px] h-[118px] w-[100px] rounded-md bg-[#5b6478]" />
              <div className="absolute left-[58px] top-[30px] h-[55px] w-[80px] rounded-sm bg-[#0b0f19]/50" />
              <motion.div
                className="absolute left-[62px] top-[38px] h-[28px] w-[72px] rounded-sm"
                style={{ background: "var(--pc-gradient)" }}
                animate={
                  reduce
                    ? undefined
                    : {
                        opacity: [0.55, 1, 0.55],
                        boxShadow: [
                          "0 0 8px #7c6cf6",
                          "0 0 28px #38d9c9",
                          "0 0 8px #7c6cf6",
                        ],
                      }
                }
                transition={{ duration: 2.4, ...loop }}
              />
            </>
          )}
        </motion.div>
      </div>
      {accent && (
        <div className="absolute bottom-3 left-3 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-teal backdrop-blur">
          Peak window
        </div>
      )}
    </div>
  );
}

export function PhaseShowcase() {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(3);

  return (
    <section className="bg-offwhite px-5 py-16 md:px-10 md:py-24">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-purple">
          Construction phase intelligence
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-ink md:text-4xl">
          Watch a job move from groundbreaking to sign-ready.
        </h2>
        <p className="mt-3 max-w-xl text-slate">
          Five miniature dioramas — one connected sequence — showing when signage
          probability peaks.
        </p>

        <div
          ref={scroller}
          className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] md:gap-6 [&::-webkit-scrollbar]:hidden"
          onScroll={() => {
            const el = scroller.current;
            if (!el) return;
            const card = el.firstElementChild as HTMLElement | null;
            if (!card) return;
            const idx = Math.round(el.scrollLeft / (card.offsetWidth + 16));
            setActive(Math.min(PHASES.length - 1, Math.max(0, idx)));
          }}
        >
          {PHASES.map((phase, i) => (
            <article
              key={phase.id}
              className="w-[min(85vw,300px)] shrink-0 snap-center md:w-[280px]"
              onClick={() => setActive(i)}
            >
              <Diorama phaseId={phase.id} accent={phase.accent} />
              <h3
                className={cn(
                  "mt-4 text-base font-bold text-ink",
                  active === i && "pc-gradient-text",
                )}
              >
                {phase.label}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate">{phase.blurb}</p>
            </article>
          ))}
        </div>

        <div className="mt-4 flex justify-center gap-2 md:hidden">
          {PHASES.map((p, i) => (
            <button
              key={p.id}
              type="button"
              aria-label={`Go to ${p.label}`}
              className={cn(
                "h-2 w-2 rounded-full transition",
                active === i ? "bg-purple" : "bg-line",
              )}
              onClick={() => {
                const el = scroller.current;
                const card = el?.children[i] as HTMLElement | undefined;
                card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                setActive(i);
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
