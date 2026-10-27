import { ThinkingBlob } from "@/components/ui/ThinkingBlob";

export default function JobsLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4 py-10">
      <ThinkingBlob size="panel" label="Loading jobs" />
    </div>
  );
}
