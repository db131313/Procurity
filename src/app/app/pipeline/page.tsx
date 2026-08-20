import { PipelineBoard } from "@/components/app/PipelineBoard";
import { getCurrentUser } from "@/lib/auth/session";
import { getProject, listPipeline, listProjects } from "@/lib/db/store";
import Link from "next/link";

export default async function PipelinePage() {
  const user = await getCurrentUser();
  const items = user ? await listPipeline(user.id) : [];

  // Prefer one projects list over N+1 getProject round-trips when possible.
  const projectIds = new Set(items.map((i) => i.projectId));
  const all =
    projectIds.size > 0
      ? await listProjects().then((ps) =>
          ps.filter((p) => projectIds.has(p.id)),
        )
      : [];
  const byId = new Map(all.map((p) => [p.id, p]));

  const cards = (
    await Promise.all(
      items.map(async (item) => {
        let project = byId.get(item.projectId) ?? null;
        if (!project) project = await getProject(item.projectId);
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
        Track deals by status — change stage on each card.
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
