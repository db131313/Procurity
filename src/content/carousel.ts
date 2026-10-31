/**
 * Feature carousel content — edit ONLY this file to swap videos, captions, or screens.
 *
 * - label:      accessible slide name
 * - head:       big per-slide header (two short lines; use \n for the break)
 * - caption:    short line under the header that changes per slide
 * - video:      { webm, mp4, poster, anim } — same mp4 → one shared <video>
 *               anim = looping animated WebP used if video autoplay is blocked
 * - screen:     discover | contact | measure | design | quote (Estimate uses quote)
 * - duration:   ms this slide stays up (match the clip length)
 * - phone:      { in, out } ms — phone pops in at `in` and stays until slide change
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
  /** Looping animated WebP fallback when video autoplay is refused. */
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
    head: "Find the job\nbefore they do.",
    caption: "Projects ready to buy, near you",
    screen: "discover",
    duration: 10000,
    phone: { in: 4400, out: 10000 },
    speed: 1.75,
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
    head: "Know exactly\nwho to call.",
    caption: "The contact for every site",
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
      anim: "/home/field-3.webp",
    },
  },
  {
    label: "Measure",
    head: "Measure it\nin seconds.",
    caption: "Exact sizes, right on the wall",
    screen: "measure",
    duration: 5800,
    phone: { in: 1800, out: 5800 },
    speed: 1.45,
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
    head: "Show them the\nfinished sign.",
    caption: "Preview it before you build it",
    screen: "design",
    duration: 10000,
    phone: { in: 3000, out: 10000 },
    speed: 1.4,
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
    caption: "Win the work on the spot",
    screen: "quote",
    duration: 10000,
    phone: { in: 800, out: 10000 },
    speed: 1.1,
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
