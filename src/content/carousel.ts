/**
 * Feature carousel content — edit ONLY this file to swap videos, captions, or screens.
 *
 * Stationary header ("Find the job. Win the work.") lives in FeatureCarousel JSX.
 *
 * - label:      accessible slide name
 * - caption:    short line under the header that changes per slide
 * - video:      { webm, mp4, poster } — same mp4 → one shared <video>
 * - screen:     discover | contact | measure | design | quote (Estimate uses quote)
 * - duration:   ms this slide stays up (match the clip length)
 * - phone:      { in, out } ms — phone only visible while the action happens
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
};

export type CarouselSlide = {
  label: string;
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
    caption: "Find who's buying",
    screen: "discover",
    duration: 10000,
    phone: { in: 4400, out: 10000 },
    speed: 1.75,
    focus: "50% 35%",
    video: {
      webm: "/home/bg-discover.webm",
      mp4: "/home/bg-discover.mp4",
      poster: "/home/bg-discover.jpg",
    },
  },
  {
    label: "Connect",
    caption: "Connect",
    screen: "contact",
    duration: 10000,
    phone: { in: 900, out: 9600 },
    speed: 1.1,
    focus: "50% 40%",
    video: {
      webm: "/home/field-3.webm",
      mp4: "/home/field-3.mp4",
      webm640: "/home/field-3-640.webm",
      mp4640: "/home/field-3-640.mp4",
      poster: "/home/field-3.jpg",
    },
  },
  {
    label: "Measure",
    caption: "Measure",
    screen: "measure",
    duration: 5800,
    phone: { in: 1800, out: 5800 },
    speed: 1.45,
    focus: "50% 40%",
    video: {
      webm: "/home/bg-measure.webm",
      mp4: "/home/bg-measure.mp4",
      poster: "/home/bg-measure.jpg",
    },
  },
  {
    label: "Design",
    caption: "Design",
    screen: "design",
    duration: 10000,
    phone: { in: 3000, out: 10000 },
    speed: 1.4,
    focus: "50% 45%",
    video: {
      webm: "/home/bg-design.webm",
      mp4: "/home/bg-design.mp4",
      poster: "/home/bg-design.jpg",
    },
  },
  {
    label: "Estimate",
    caption: "Estimate",
    screen: "quote",
    duration: 10000,
    phone: { in: 800, out: 10000 },
    speed: 1.1,
    focus: "50% 45%",
    video: {
      webm: "/home/bg-quote.webm",
      mp4: "/home/bg-quote.mp4",
      poster: "/home/bg-quote.jpg",
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
