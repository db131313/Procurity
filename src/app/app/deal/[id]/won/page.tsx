import Link from "next/link";
import { notFound } from "next/navigation";
import { DealWonConfetti } from "@/components/app/DealWonConfetti";
import { getCurrentUser } from "@/lib/auth/session";
import { getProject, listPipeline } from "@/lib/db/store";
import { formatMoneyRange } from "@/lib/format";

export default async function DealWonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(decodeURIComponent(id));
  if (!project) notFound();

  const user = await getCurrentUser();
  const pipeline = user ? await listPipeline(user.id) : [];
  const won = pipeline.filter((p) => p.stage === "won");
  const winRate =
    pipeline.length > 0 ? Math.round((won.length / pipeline.length) * 100) : 100;

  return (
    <main className="relative flex min-h-[70dvh] flex-col items-center justify-center px-5 py-12 text-center md:px-8">
      <DealWonConfetti />
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal">
        Deal closed
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink md:text-5xl">
        You won it.
      </h1>
      <p className="mt-3 max-w-md text-slate">
        {project.address} ·{" "}
        {formatMoneyRange(project.estValueLow, project.estValueHigh)}
      </p>

      <div className="mt-8 grid w-full max-w-sm grid-cols-2 gap-3">
        <div className="pc-card p-4">
          <p className="text-2xl font-bold tabular-nums text-ink">{winRate}%</p>
          <p className="mt-1 text-xs font-semibold text-slate">Win rate</p>
        </div>
        <div className="pc-card p-4">
          <p className="text-2xl font-bold tabular-nums text-ink">{won.length}</p>
          <p className="mt-1 text-xs font-semibold text-slate">Deals won</p>
        </div>
      </div>

      <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
        <Link
          href="/app/pipeline"
          className="pc-gradient-bg flex h-12 items-center justify-center rounded-full text-sm font-bold text-white"
        >
          Back to pipeline
        </Link>
        <Link
          href="/app/map"
          className="flex h-12 items-center justify-center rounded-full border border-line bg-white text-sm font-bold text-ink"
        >
          Find more opportunities
        </Link>
      </div>
    </main>
  );
}
