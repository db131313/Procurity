import { Skeleton } from "@/components/ui/Skeleton";

export default function RouteLoading() {
  return (
    <main className="mx-auto max-w-lg space-y-4 px-5 py-8">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-14 w-full rounded-full" />
    </main>
  );
}
