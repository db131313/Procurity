import { Skeleton } from "@/components/ui/Skeleton";

/** Instant shell while Home RSC loads projects — keeps bottom-nav taps feeling live. */
export default function HomeLoading() {
  return (
    <main className="px-5 py-6 md:px-8 md:py-8">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-3 h-8 w-64" />
      <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      <div className="mt-5 grid grid-cols-3 gap-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <Skeleton className="mt-5 h-14 w-full rounded-full" />
      <div className="mt-6 flex gap-3 overflow-hidden">
        <Skeleton className="h-40 min-w-[280px]" />
        <Skeleton className="h-40 min-w-[280px]" />
      </div>
    </main>
  );
}
