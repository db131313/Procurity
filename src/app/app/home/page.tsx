import Link from "next/link";
import { ProjectCard } from "@/components/app/ProjectCard";
import { getCurrentUser } from "@/lib/auth/session";
import { listPipeline, listProjects } from "@/lib/db/store";

export default async function AppHomePage() {
  const user = await getCurrentUser();
  const projects = await listProjects({
    zipCodes: user?.zipCodes.length ? user.zipCodes : undefined,
  });
  const top = projects.slice(0, 8);
  const pipeline = user ? await listPipeline(user.id) : [];
  const won = pipeline.filter((p) => p.stage === "won");
  const winRate =
    pipeline.length > 0 ? Math.round((won.length / pipeline.length) * 100) : 0;

  return (
    <main className="px-5 py-6 md:px-8 md:py-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-purple">
        Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink md:text-3xl">
        Today&apos;s opportunities
      </h1>
      <p className="mt-1 text-sm text-slate">
        Ranked by Buy Score in your subscribed zips.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {[
          { label: "Opps today", value: String(top.length) },
          { label: "Pipeline", value: String(pipeline.length) },
          { label: "Win rate", value: `${winRate}%` },
        ].map((s) => (
          <div key={s.label} className="pc-card p-3 text-center">
            <p className="text-xl font-bold tabular-nums text-ink md:text-2xl">
              {s.value}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate">{s.label}</p>
          </div>
        ))}
      </div>

      <Link
        href="/app/map"
        className="pc-gradient-bg mt-5 flex h-14 items-center justify-center rounded-full text-sm font-bold text-white shadow-[0_12px_28px_rgba(124,108,246,0.28)] transition active:scale-[0.98]"
      >
        Find My Opportunities
      </Link>

      <div className="mt-6 flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-3">
        {top.map((p) => (
          <div key={p.id} className="min-w-[280px] md:min-w-0">
            <ProjectCard project={p} />
          </div>
        ))}
      </div>

      {!top.length && (
        <div className="pc-card mt-6 p-6 text-center">
          <p className="font-bold text-ink">No projects in your zips yet</p>
          <p className="mt-1 text-sm text-slate">
            Sync DOB data or adjust zip codes in settings.
          </p>
        </div>
      )}
    </main>
  );
}
