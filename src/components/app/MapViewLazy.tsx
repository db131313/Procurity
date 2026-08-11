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
      <div className="absolute inset-0 flex flex-col gap-3 bg-[#dfe7ef] p-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="min-h-0 w-full flex-1" />
      </div>
    ),
  },
);

export function MapViewLazy({ projects }: { projects: MapProject[] }) {
  return <MapView projects={projects} />;
}
