export type HomeMediaAvailability = {
  heroPhoto: boolean;
  fieldVideoMp4: boolean;
  fieldVideoWebm: boolean;
  fieldPoster: boolean;
  fieldVideo2Mp4: boolean;
  fieldVideo2Webm: boolean;
  fieldPoster2: boolean;
  shotMap: boolean;
  shotCard: boolean;
  shotMeasure: boolean;
  shotQuote: boolean;
  /** When false, the entire iPhone LiDAR marketing block stays hidden */
  showIphoneApp: boolean;
};

/** Optional portrait field clips under public/home/. Slot omitted if neither mp4 nor webm exists. */
export const HOME_FIELD_VIDEOS = [
  {
    id: "field-1" as const,
    mp4Key: "fieldVideoMp4" as const,
    webmKey: "fieldVideoWebm" as const,
    posterKey: "fieldPoster" as const,
    mp4Src: "/home/field-video.mp4",
    webmSrc: "/home/field-video.webm",
    posterSrc: "/home/field-poster.jpg",
    label: "On the job site",
  },
  {
    id: "field-2" as const,
    mp4Key: "fieldVideo2Mp4" as const,
    webmKey: "fieldVideo2Webm" as const,
    posterKey: "fieldPoster2" as const,
    mp4Src: "/home/field-video-2.mp4",
    webmSrc: "/home/field-video-2.webm",
    posterSrc: "/home/field-poster-2.jpg",
    label: "Close the deal",
  },
];

export const HOME_SHOTS = [
  {
    key: "shotMap" as const,
    src: "/home/map.png",
    alt: "Map of commercial projects with heat-colored dots",
    caption: "See what's about to be built",
  },
  {
    key: "shotCard" as const,
    src: "/home/project-card.png",
    alt: "Project card with street view and Buy Score",
    caption: "Know who to call and why now",
  },
  {
    key: "shotMeasure" as const,
    src: "/home/measure-quote.png",
    alt: "Measure and quote workflow",
    caption: "Measure and quote on site",
  },
  {
    key: "shotQuote" as const,
    src: "/home/quote-pdf.png",
    alt: "Quote PDF preview",
    caption: "Send a quote for deposit",
  },
];
