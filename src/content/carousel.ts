/**
 * Feature carousel content — edit ONLY this file to swap videos, copy, or screens.
 *
 * - video: full-bleed background { webm, mp4, webm640?, mp4640?, poster }
 * - screen: which phone screen (discover|measure|design|quote|invoice)
 * - screenshot: optional image path; when set, replaces the drawn phone screen
 * - cta: optional { label, href } under the copy
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

const FIELD3: CarouselVideo = {
  webm: "/home/field-3.webm",
  mp4: "/home/field-3.mp4",
  webm640: "/home/field-3-640.webm",
  mp4640: "/home/field-3-640.mp4",
  poster: "/home/field-3.webp",
};

export const SLIDES: CarouselSlide[] = [
  {
    label: "Discover",
    title: "See every commercial build near you.",
    body: "Scored by how soon each one will buy. Tap one to start a job.",
    screen: "discover",
    video: FIELD3,
  },
  {
    label: "Measure",
    title: "Scan the opening. Get real dimensions.",
    body: "LiDAR on your iPhone saves exact sizes straight to the job.",
    screen: "measure",
    video: FIELD3,
  },
  {
    label: "Design",
    title: "Pick the sign. Price it from your list.",
    body: "Type, material and color, priced from your own supplier price book.",
    screen: "design",
    video: FIELD3,
  },
  {
    label: "Quote",
    title: "One tap sends a branded quote.",
    body: "Your client approves it from their phone.",
    screen: "quote",
    video: FIELD3,
  },
  {
    label: "Invoice",
    title: "Bill in full or take a 50% deposit.",
    body: "Send a payment link. The paperwork is packaged for your head office.",
    screen: "invoice",
    video: FIELD3,
    cta: { label: "Start free", href: "/signup" },
  },
];
