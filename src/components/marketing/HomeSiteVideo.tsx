"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const CAPTIONS = [
  { at: 0, text: "Walking the job site" },
  { at: 3, text: "Scanning the opening" },
  { at: 6, text: "Leaving with the quote" },
] as const;

/**
 * Single field-3 video: left flush panel + copy on the right (stacks on mobile).
 */
export function HomeSiteVideo() {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [caption, setCaption] = useState<string>(CAPTIONS[0].text);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      el.pause();
      return;
    }

    const onTime = () => {
      const t = el.currentTime;
      let next: string = CAPTIONS[0].text;
      for (const c of CAPTIONS) {
        if (t >= c.at) next = c.text;
      }
      setCaption(next);
    };
    el.addEventListener("timeupdate", onTime);

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) void el.play().catch(() => {});
          else el.pause();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      io.disconnect();
    };
  }, []);

  return (
    <section
      className="border-t border-[var(--line)] bg-[#0B0D0E]"
      data-testid="home-site-video"
      id="site"
    >
      <div className="grid md:grid-cols-2">
        <div className="relative min-w-0 overflow-hidden bg-black md:min-h-[min(80vh,820px)]">
          <video
            ref={ref}
            className="aspect-[9/16] w-full object-cover md:absolute md:inset-0 md:aspect-auto md:h-full"
            poster="/home/field-3.jpg"
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="Walking a commercial job site"
          >
            <source src="/home/field-3.webm" type="video/webm" />
            <source src="/home/field-3.mp4" type="video/mp4" />
          </video>
          <div
            className="pointer-events-none absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm"
            data-testid="site-caption"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: "var(--aurora)" }}
              aria-hidden
            />
            {caption}
          </div>
        </div>

        <div className="flex items-center px-6 py-14 md:px-12 md:py-20 lg:px-16">
          <div className="mx-auto max-w-md md:mx-0">
            <h2 className="text-3xl font-semibold leading-[1.1] tracking-tight text-white md:text-4xl lg:text-[2.75rem]">
              Walk the site. Leave with the measurements.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--mute)] md:text-lg">
              Scan the opening with your iPhone, drop the sign into the design,
              and send a branded quote before you reach the car.
            </p>
            <Link
              href="/signup"
              className="bw-btn-primary pc-press mt-8 inline-flex h-12 px-7 text-sm"
            >
              Start free
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
