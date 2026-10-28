/**
 * Feature carousel content — edit ONLY this file to swap videos, captions, or screens.
 *
 * - label:      tab name along the bottom
 * - caption:    1–2 words under the phone
 * - video:      { webm, mp4, poster, webm640?, mp4640? } — slides sharing mp4 share one <video>
 * - screen:     discover | measure | design | quote | invoice
 * - screenshot: optional image path; replaces the animated phone screen when set
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
  webm640?: string;
  mp4640?: string;
  poster: string;
};

export type CarouselSlide = {
  label: string;
  caption: string;
  screen: CarouselScreenId;
  screenshot?: string;
  video: CarouselVideo;
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
    caption: "On site",
    screen: "discover",
    video: FIELD3,
  },
  {
    label: "Measure",
    caption: "Measuring",
    screen: "measure",
    video: FIELD3,
  },
  {
    label: "Design",
    caption: "Designing",
    screen: "design",
    video: FIELD3,
  },
  {
    label: "Quote",
    caption: "Quoting",
    screen: "quote",
    video: FIELD3,
  },
  {
    label: "Invoice",
    caption: "Invoicing",
    screen: "invoice",
    video: FIELD3,
  },
];

export function uniqueVideos(slides: CarouselSlide[] = SLIDES): CarouselVideo[] {
  const seen = new Map<string, CarouselVideo>();
  for (const s of slides) {
    if (!seen.has(s.video.mp4)) seen.set(s.video.mp4, s.video);
  }
  return [...seen.values()];
}
