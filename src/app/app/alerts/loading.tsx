import { Skeleton } from "@/components/ui/Skeleton";

export default function AlertsLoading() {
  return (
    <main className="px-5 py-6 md:px-8">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="mt-2 h-4 w-56" />
      <div className="mt-6 space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </main>
  );
}
