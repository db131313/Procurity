import { ThinkingBlob } from "@/components/ui/ThinkingBlob";

export default function RouteLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <ThinkingBlob size="panel" label="Loading route" />
    </div>
  );
}
