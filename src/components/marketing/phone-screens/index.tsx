"use client";

import type { CarouselScreenId } from "@/content/carousel";
import { DiscoverScreen } from "./DiscoverScreen";
import { ConnectScreen } from "./ConnectScreen";
import { MeasureScreen } from "./MeasureScreen";
import { DesignScreen } from "./DesignScreen";
import { QuoteScreen } from "./QuoteScreen";
import styles from "../FeatureCarousel.module.css";

export function PhoneScreen({
  id,
  screenshot,
}: {
  id: CarouselScreenId;
  screenshot?: string;
}) {
  if (screenshot) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img className={styles.shot} src={screenshot} alt="" />
    );
  }
  switch (id) {
    case "discover":
      return <DiscoverScreen />;
    case "contact":
      return <ConnectScreen />;
    case "measure":
      return <MeasureScreen />;
    case "design":
      return <DesignScreen />;
    case "quote":
      return <QuoteScreen />;
  }
}
