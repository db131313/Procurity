/**
 * Feature carousel content — edit ONLY this file to swap videos, copy, or screens.
 *
 * - video: full-bleed background { webm, mp4, webm640?, mp4640?, poster }
 * - screen: which phone screen (discover|measure|design|quote|invoice)
 * - screenshot: optional image path; when set, replaces the drawn phone screen
 * - cta: optional { label, href } under the copy
 *
 * Keep titles short (3–4 words) and body to one short line.
 */

export type CarouselScreenId =
  | "discover"
  | "measure"
  | "design"
  | "quote"
  | "invoice";

export type CarouselVideo = {
  webm: string;
  mp4: string;
  /** Optional 640px sources for max-width:820px */
  webm640?: string;
  mp4640?: string;
  poster: string;
};

export type CarouselSlide = {
  label: string;
  title: string;
  body: string;
  screen: CarouselScreenId;
  screenshot?: string;
  video: CarouselVideo;
  cta?: { label: string; href: string };
};

/** Versioned filenames bust immutable /home/* caches after re-encode. */
const FIELD3: CarouselVideo = {
  webm: "/home/field-3-v2.webm",
  mp4: "/home/field-3-v2.mp4",
  webm640: "/home/field-3-v2-640.webm",
  mp4640: "/home/field-3-v2-640.mp4",
  poster: "/home/field-3-v2.webp",
};

export const SLIDES: CarouselSlide[] = [
  {
    label: "Discover",
    title: "Find the next job.",
    body: "Every commercial build near you, scored.",
    screen: "discover",
    video: FIELD3,
  },
  {
    label: "Measure",
    title: "Measure on site.",
    body: "Scan with your iPhone.",
    screen: "measure",
    video: FIELD3,
  },
  {
    label: "Design",
    title: "Design the sign.",
    body: "Priced from your own price list.",
    screen: "design",
    video: FIELD3,
  },
  {
    label: "Quote",
    title: "Send the quote.",
    body: "Approved on their phone.",
    screen: "quote",
    video: FIELD3,
  },
  {
    label: "Invoice",
    title: "Get paid.",
    body: "Full amount or a 50% deposit.",
    screen: "invoice",
    video: FIELD3,
    cta: { label: "Start free", href: "/signup" },
  },
];

/** Unique video sources (slides that share a file reuse one <video>). */
export function uniqueVideos(slides: CarouselSlide[] = SLIDES): CarouselVideo[] {
  const seen = new Map<string, CarouselVideo>();
  for (const s of slides) {
    if (!seen.has(s.video.mp4)) seen.set(s.video.mp4, s.video);
  }
  return [...seen.values()];
}
