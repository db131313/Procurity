"use client";

import dynamic from "next/dynamic";
import type { TeaserPin } from "./TeaserMapView";
import { Skeleton } from "@/components/ui/Skeleton";

const TeaserMapView = dynamic(
  () =>
    import("./TeaserMapView").then((m) => ({ default: m.TeaserMapView })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(70dvh,560px)] items-center justify-center rounded-3xl border border-line bg-[#dfe7ef] md:h-[640px]">
        <Skeleton className="h-10 w-48" />
      </div>
    ),
  },
);

export function TeaserMapLazy(props: {
  cityLabel: string;
  cityId: string;
  center: [number, number];
  zoom: number;
  pins: TeaserPin[];
  totalCount: number;
}) {
  return <TeaserMapView {...props} />;
}
