"use client";

import dynamic from "next/dynamic";
import type { MapProject } from "@/components/app/MapView";
import { Skeleton } from "@/components/ui/Skeleton";

const MapView = dynamic(
  () =>
    import("@/components/app/MapView").then((m) => ({ default: m.MapView })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 flex-col gap-3 p-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="min-h-[60vh] w-full flex-1" />
      </div>
    ),
  },
);

export function MapViewLazy({
  projects,
  zipCodes,
}: {
  projects: MapProject[];
  zipCodes?: string[];
}) {
  return <MapView projects={projects} zipCodes={zipCodes} />;
}
