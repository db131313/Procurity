export type HomeMediaAvailability = {
  heroPhoto: boolean;
  shotMap: boolean;
  shotCard: boolean;
  shotMeasure: boolean;
  shotQuote: boolean;
  /** When false, the entire iPhone LiDAR marketing block stays hidden */
  showIphoneApp: boolean;
};

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
