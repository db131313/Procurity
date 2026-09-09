import { Skeleton } from "@/components/ui/Skeleton";

export default function PipelineLoading() {
  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-2 h-4 w-64" />
      <div className="mt-6 flex gap-3 overflow-hidden">
        <Skeleton className="h-72 min-w-[260px] flex-1" />
        <Skeleton className="h-72 min-w-[260px] flex-1" />
        <Skeleton className="hidden h-72 min-w-[260px] flex-1 md:block" />
      </div>
    </main>
  );
}
