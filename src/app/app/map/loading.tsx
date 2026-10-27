import { ThinkingBlob } from "@/components/ui/ThinkingBlob";

export default function MapLoading() {
  return (
    <main className="relative flex h-full min-h-0 w-full flex-1 items-center justify-center overflow-hidden bg-[#dfe7ef]">
      <ThinkingBlob size="panel" label="Loading map" />
    </main>
  );
}
