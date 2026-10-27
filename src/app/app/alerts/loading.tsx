import { ThinkingBlob } from "@/components/ui/ThinkingBlob";

export default function AlertsLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <ThinkingBlob size="panel" label="Loading alerts" />
    </div>
  );
}
