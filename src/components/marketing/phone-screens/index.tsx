"use client";

import type { RefObject } from "react";
import type { CarouselScreenId, CarouselVideo } from "@/content/carousel";
import { DiscoverScreen } from "./DiscoverScreen";
import { MeasureScreen } from "./MeasureScreen";
import { DesignScreen } from "./DesignScreen";
import { QuoteScreen } from "./QuoteScreen";
import { InvoiceScreen } from "./InvoiceScreen";
import styles from "../FeatureCarousel.module.css";

export function PhoneScreen({
  id,
  active,
  screenshot,
  measureVideo,
  measurePlay,
  measureRef,
  reducedMotion,
}: {
  id: CarouselScreenId;
  active: boolean;
  screenshot?: string;
  measureVideo: CarouselVideo;
  measurePlay: boolean;
  measureRef: RefObject<HTMLVideoElement | null>;
  reducedMotion: boolean;
}) {
  if (screenshot) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img className={styles.shot} src={screenshot} alt="" data-active={active} />
    );
  }
  switch (id) {
    case "discover":
      return <DiscoverScreen />;
    case "measure":
      return (
        <MeasureScreen
          playVideo={measurePlay}
          video={measureVideo}
          videoRef={measureRef}
          reducedMotion={reducedMotion}
        />
      );
    case "design":
      return <DesignScreen />;
    case "quote":
      return <QuoteScreen />;
    case "invoice":
      return <InvoiceScreen />;
  }
}
