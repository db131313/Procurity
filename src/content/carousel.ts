/**
 * Feature carousel content — edit ONLY this file to swap videos, captions, or screens.
 *
 * - label:      accessible slide name
 * - head:       big per-slide header (two short lines; use \n for the break)
 * - caption:    short line under the header that changes per slide
 * - video:      { webm, mp4, poster, anim } — same mp4 → one shared <video>
 *               anim = animated WebP fallback (play once, hold last frame)
 * - screen:     discover | contact | measure | design | quote (Estimate uses quote)
 * - ui:         phone mockup | floating cards (Connect/Design — no phone)
 * - duration:   ms this slide stays up (clip length − ~0.6s; no frozen last frame)
 * - phone:      { in, out } ms — UI up at `in`, down at `out` (~0.9s before end)
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

export type CarouselUi = "phone" | "cards";

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
  /** Phone mockup vs floating card stack (Connect + Design). */
  ui: CarouselUi;
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
    ui: "phone",
    duration: 9400,
    phone: { in: 2600, out: 8500 },
    speed: 1.65,
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
    head: "Capture the\nclient's info.",
    caption: "Contacts for every site, one tap away",
    screen: "contact",
    ui: "cards",
    duration: 9400,
    phone: { in: 900, out: 8500 },
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
    ui: "phone",
    duration: 5300,
    phone: { in: 1000, out: 4400 },
    speed: 1.7,
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
    ui: "cards",
    duration: 9400,
    phone: { in: 1000, out: 8500 },
    speed: 1.5,
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
    ui: "phone",
    duration: 9400,
    phone: { in: 800, out: 8500 },
    speed: 1.3,
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
