"use client";

import { useEffect, useRef } from "react";

const CLIPS = [
  {
    id: "field-1",
    mp4: "/home/field-1.mp4",
    webm: "/home/field-1.webm",
    poster: "/home/field-1.jpg",
    label: "Find the job",
  },
  {
    id: "field-2",
    mp4: "/home/field-2.mp4",
    webm: "/home/field-2.webm",
    poster: "/home/field-2.jpg",
    label: "Show up ready",
  },
  {
    id: "field-3",
    mp4: "/home/field-3.mp4",
    webm: "/home/field-3.webm",
    poster: "/home/field-3.jpg",
    label: "Close the deal",
  },
] as const;

function FieldVideo({
  mp4,
  webm,
  poster,
  label,
}: {
  mp4: string;
  webm: string;
  poster: string;
  label: string;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      el.pause();
      el.removeAttribute("autoplay");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            void el.play().catch(() => {});
          } else {
            el.pause();
          }
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <figure className="relative m-0 min-w-0 overflow-hidden bg-black">
      <video
        ref={ref}
        className="aspect-[9/16] h-full w-full object-cover md:aspect-auto md:min-h-[min(72vh,720px)]"
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={label}
      >
        <source src={webm} type="video/webm" />
        <source src={mp4} type="video/mp4" />
      </video>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}

/** Edge-to-edge 3-up video band — no gaps on desktop, stacked on mobile. */
export function HomeVideoBand() {
  return (
    <section
      className="w-full"
      data-testid="home-video-band"
      aria-label="In the field"
    >
      <div className="grid grid-cols-1 gap-0 md:grid-cols-3">
        {CLIPS.map((c) => (
          <FieldVideo key={c.id} {...c} />
        ))}
      </div>
    </section>
  );
}
