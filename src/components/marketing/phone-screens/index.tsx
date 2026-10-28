"use client";

import type { CarouselScreenId } from "@/content/carousel";
import { DiscoverScreen } from "./DiscoverScreen";
import { MeasureScreen } from "./MeasureScreen";
import { DesignScreen } from "./DesignScreen";
import { QuoteScreen } from "./QuoteScreen";
import { InvoiceScreen } from "./InvoiceScreen";
import styles from "../FeatureCarousel.module.css";

export function PhoneScreen({
  id,
  screenshot,
  measurePoster,
}: {
  id: CarouselScreenId;
  screenshot?: string;
  measurePoster: string;
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
    case "measure":
      return <MeasureScreen poster={measurePoster} />;
    case "design":
      return <DesignScreen />;
    case "quote":
      return <QuoteScreen />;
    case "invoice":
      return <InvoiceScreen />;
  }
}
