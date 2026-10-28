/**
 * Feature carousel content — edit ONLY this file to swap videos, captions, or screens.
 *
 * - label:      tab name along the bottom
 * - caption:    1–2 words under the phone
 * - video:      { webm, mp4, poster } — slides sharing mp4 share one <video>
 * - screen:     discover | measure | design | quote | invoice
 * - duration:   ms this slide stays up (match the clip length so the story finishes)
 * - focus:      CSS object-position for the video crop on wide screens
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
  /** Milliseconds this slide stays up — tab progress uses the same value. */
  duration: number;
  /** CSS object-position for cropping the background video. */
  focus: string;
  video: CarouselVideo;
};

export const SLIDES: CarouselSlide[] = [
  {
    label: "Discover",
    caption: "On site",
    screen: "discover",
    duration: 10000,
    focus: "50% 40%",
    video: {
      webm: "/home/field-3.webm",
      mp4: "/home/field-3.mp4",
      poster: "/home/field-3.jpg",
    },
  },
  {
    label: "Measure",
    caption: "Measuring",
    screen: "measure",
    duration: 5800,
    focus: "50% 40%",
    video: {
      webm: "/home/bg-measure.webm",
      mp4: "/home/bg-measure.mp4",
      poster: "/home/bg-measure.jpg",
    },
  },
  {
    label: "Design",
    caption: "Designing",
    screen: "design",
    duration: 10000,
    focus: "50% 45%",
    video: {
      webm: "/home/bg-design.webm",
      mp4: "/home/bg-design.mp4",
      poster: "/home/bg-design.jpg",
    },
  },
  {
    label: "Quote",
    caption: "Quoting",
    screen: "quote",
    duration: 10000,
    focus: "50% 45%",
    video: {
      webm: "/home/bg-quote.webm",
      mp4: "/home/bg-quote.mp4",
      poster: "/home/bg-quote.jpg",
    },
  },
  {
    label: "Invoice",
    caption: "Invoicing",
    screen: "invoice",
    duration: 10000,
    focus: "50% 45%",
    video: {
      webm: "/home/bg-invoice.webm",
      mp4: "/home/bg-invoice.mp4",
      poster: "/home/bg-invoice.jpg",
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
