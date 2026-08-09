import { Suspense } from "react";
import { PipelineScreen } from "@/components/mobile/PipelineScreen";

export default function PipelinePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-pc-slate">Loading pipeline…</div>}>
      <PipelineScreen />
    </Suspense>
  );
}
