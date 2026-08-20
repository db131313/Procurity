import { Skeleton } from "@/components/ui/Skeleton";

export default function SettingsLoading() {
  return (
    <main className="px-5 py-6 md:px-8 md:py-8">
      <Skeleton className="h-8 w-36" />
      <Skeleton className="mt-2 h-4 w-72 max-w-full" />
      <div className="mt-6 space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </main>
  );
}
