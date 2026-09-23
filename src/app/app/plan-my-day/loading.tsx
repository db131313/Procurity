import { Skeleton } from "@/components/ui/Skeleton";

export default function PlanMyDayLoading() {
  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center px-5 py-16">
      <Skeleton className="h-7 w-24 rounded-full" />
      <Skeleton className="mt-4 h-8 w-48" />
      <Skeleton className="mt-6 h-12 w-72 rounded-2xl" />
      <Skeleton className="mt-3 h-3 w-40" />
    </main>
  );
}
