import { ThinkingBlob } from "@/components/ui/ThinkingBlob";

export default function RootLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-black">
      <ThinkingBlob size="fullscreen" label="Loading" />
    </div>
  );
}
