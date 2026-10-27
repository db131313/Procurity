import { ThinkingBlob } from "@/components/ui/ThinkingBlob";

export default function HomeLoading() {
  return (
    <main className="flex min-h-[50vh] items-center justify-center px-5 py-6">
      <ThinkingBlob size="panel" label="Loading" />
    </main>
  );
}
