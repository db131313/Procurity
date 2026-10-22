import fs from "node:fs";
import path from "node:path";
import type { HomeMediaAvailability } from "./home-media-shared";

export type { HomeMediaAvailability } from "./home-media-shared";
export { HOME_SHOTS } from "./home-media-shared";

function exists(file: string): boolean {
  try {
    return fs.existsSync(path.join(process.cwd(), "public", "home", file));
  } catch {
    return false;
  }
}

/** Server-side check of optional public/home media files. */
export function getHomeMediaAvailability(): HomeMediaAvailability {
  return {
    heroPhoto: exists("hero-photo.jpg"),
    fieldVideoMp4: exists("field-video.mp4"),
    fieldVideoWebm: exists("field-video.webm"),
    fieldPoster: exists("field-poster.jpg"),
    fieldVideo2Mp4: exists("field-video-2.mp4"),
    fieldVideo2Webm: exists("field-video-2.webm"),
    fieldPoster2: exists("field-poster-2.jpg"),
    shotMap: exists("map.png"),
    shotCard: exists("project-card.png"),
    shotMeasure: exists("measure-quote.png"),
    shotQuote: exists("quote-pdf.png"),
    showIphoneApp: Boolean(process.env.NEXT_PUBLIC_IOS_APP_URL?.trim()),
  };
}
