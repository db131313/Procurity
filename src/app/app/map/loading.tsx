import { Skeleton } from "@/components/ui/Skeleton";

/** Shown while the map RSC auto-syncs / loads project pins. */
export default function MapLoading() {
  return (
    <main className="relative h-full min-h-0 w-full flex-1 overflow-hidden bg-[#dfe7ef]">
      <div className="absolute inset-0 flex flex-col gap-3 p-4 pb-8">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-14 rounded-full" />
          <Skeleton className="ml-auto h-8 w-20 rounded-full" />
        </div>
        <Skeleton className="min-h-0 w-full flex-1 rounded-none" />
        <Skeleton className="h-28 w-36 rounded-2xl" />
      </div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="rounded-2xl border border-line bg-white/95 px-4 py-3 text-sm font-semibold text-slate shadow-md backdrop-blur">
          Loading map data…
        </div>
      </div>
    </main>
  );
}
