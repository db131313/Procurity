import { PipelineBoard } from "@/components/app/PipelineBoard";
import { getCurrentUser } from "@/lib/auth/session";
import { getProject, listPipeline } from "@/lib/db/store";
import Link from "next/link";

export default async function PipelinePage() {
  const user = await getCurrentUser();
  const items = user ? await listPipeline(user.id) : [];

  const cards = (
    await Promise.all(
      items.map(async (item) => {
        const project = await getProject(item.projectId);
        if (!project) return null;
        return {
          itemId: item.id,
          projectId: item.projectId,
          stage: item.stage,
          score: project.score,
          address: project.address,
        };
      }),
    )
  ).filter(Boolean) as {
    itemId: string;
    projectId: string;
    stage: "new" | "contacted" | "quoted" | "won" | "lost";
    score: number;
    address: string;
  }[];

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-2xl font-bold tracking-tight text-ink md:text-3xl">
        Pipeline
      </h1>
      <p className="mt-1 text-sm text-slate">
        Drag deals across stages — or use stage buttons on mobile.
      </p>

      {!cards.length ? (
        <div className="pc-card mt-8 p-8 text-center">
          <p className="font-bold text-ink">No deals in your pipeline</p>
          <p className="mt-1 text-sm text-slate">
            Open a project and tap Add to Pipeline.
          </p>
          <Link
            href="/app/map"
            className="pc-gradient-bg mt-5 inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-bold text-white"
          >
            Browse map
          </Link>
        </div>
      ) : (
        <div className="mt-6">
          <PipelineBoard initialCards={cards} />
        </div>
      )}
    </main>
  );
}
