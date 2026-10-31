/**
 * Feature carousel content — edit ONLY this file to swap videos, captions, or screens.
 *
 * - label:      accessible slide name
 * - head:       big per-slide header (two short lines; use \n for the break)
 * - caption:    short line under the header that changes per slide
 * - video:      { webm, mp4, poster, anim } — same mp4 → one shared <video>
 *               anim = animated WebP fallback (play once, hold last frame)
 * - screen:     discover | contact | measure | design | quote (Estimate uses quote)
 * - duration:   ms this slide stays up (~clip length + 1.5s hold)
 * - phone:      { in, out } ms — pops in at `in`, slides out ~0.9s before `out`/end
 * - speed:      Web Animations playbackRate for the CSS screen timeline
 * - focus:      CSS object-position for the video crop
 * - screenshot: optional image; replaces the animated screen when set
 */

export type CarouselScreenId =
  | "discover"
  | "contact"
  | "measure"
  | "design"
  | "quote";

export type CarouselVideo = {
  webm: string;
  mp4: string;
  webm640?: string;
  mp4640?: string;
  poster: string;
  /** Animated WebP fallback when video autoplay is refused (loop once). */
  anim: string;
};

export type CarouselSlide = {
  label: string;
  /** Two short lines for the big header; use `\n` between lines. */
  head: string;
  caption: string;
  screen: CarouselScreenId;
  screenshot?: string;
  duration: number;
  phone: { in: number; out: number };
  speed: number;
  focus: string;
  video: CarouselVideo;
};

export const SLIDES: CarouselSlide[] = [
  {
    label: "Discover",
    head: "Be first to\nthe job.",
    caption: "Find projects ready to buy, near you",
    screen: "discover",
    duration: 11500,
    phone: { in: 4400, out: 10700 },
    speed: 1.55,
    focus: "50% 35%",
    video: {
      webm: "/home/bg-discover.webm",
      mp4: "/home/bg-discover.mp4",
      poster: "/home/bg-discover.jpg",
      anim: "/home/bg-discover.webp",
    },
  },
  {
    label: "Connect",
    head: "Reach the\nright person.",
    caption: "Contacts for every site, one tap away",
    screen: "contact",
    duration: 11500,
    phone: { in: 900, out: 10700 },
    speed: 1.0,
    focus: "50% 40%",
    video: {
      webm: "/home/field-3.webm",
      mp4: "/home/field-3.mp4",
      webm640: "/home/field-3-640.webm",
      mp4640: "/home/field-3-640.mp4",
      poster: "/home/field-3.jpg",
      anim: "/home/field-3.webp",
    },
  },
  {
    label: "Measure",
    head: "Measure it\non the spot.",
    caption: "Point your phone, get exact sizes",
    screen: "measure",
    duration: 7300,
    phone: { in: 1800, out: 6500 },
    speed: 1.25,
    focus: "50% 40%",
    video: {
      webm: "/home/bg-measure.webm",
      mp4: "/home/bg-measure.mp4",
      poster: "/home/bg-measure.jpg",
      anim: "/home/bg-measure.webp",
    },
  },
  {
    label: "Design",
    head: "Show it before\nyou build it.",
    caption: "Preview it on their storefront",
    screen: "design",
    duration: 11500,
    phone: { in: 3000, out: 10700 },
    speed: 1.2,
    focus: "50% 45%",
    video: {
      webm: "/home/bg-design.webm",
      mp4: "/home/bg-design.mp4",
      poster: "/home/bg-design.jpg",
      anim: "/home/bg-design.webp",
    },
  },
  {
    label: "Estimate",
    head: "Send the estimate\nbefore you leave.",
    caption: "Price it and win the job on the spot",
    screen: "quote",
    duration: 11500,
    phone: { in: 800, out: 10700 },
    speed: 1.0,
    focus: "50% 45%",
    video: {
      webm: "/home/bg-quote.webm",
      mp4: "/home/bg-quote.mp4",
      poster: "/home/bg-quote.jpg",
      anim: "/home/bg-quote.webp",
    },
  },
];

export function uniqueVideos(slides: CarouselSlide[] = SLIDES): CarouselVideo[] {
  const seen = new Map<string, CarouselVideo>();
  for (const s of slides) {
    if (!seen.has(s.video.mp4)) seen.set(s.video.mp4, s.video);
  }
  return [...seen.values()];
}
