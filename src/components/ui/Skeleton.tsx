import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-gradient-to-r from-[#E8EAF0] via-[#F3F4F7] to-[#E8EAF0] bg-[length:200%_100%]",
        className,
      )}
    />
  );
}
