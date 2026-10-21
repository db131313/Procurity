import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasJobsAccess } from "@/lib/jobs/access";
import { listJobsForOwner } from "@/lib/jobs/store";
import { stageIndex } from "@/lib/jobs/types";

export default async function JobsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { error } = await searchParams;
  if (!hasJobsAccess(user)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-ink">Jobs is a paid feature</h1>
        <p className="mt-2 text-sm text-slate">
          Upgrade to Starter, Growth, or Pro to run the sign job workflow —
          capture, design, quote, and invoice.
        </p>
        <Link
          href="/app/billing"
          className="pc-gradient-bg mt-6 inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-bold text-white"
        >
          View plans
        </Link>
      </div>
    );
  }

  const jobs = await listJobsForOwner(user.id);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Jobs</h1>
          <p className="text-sm text-slate">
            Estimate → quote → invoice for sign work
          </p>
        </div>
        <Link
          href="/app/jobs/new"
          prefetch
          className="pc-gradient-bg rounded-full px-5 py-3 text-sm font-bold text-white"
        >
          New job
        </Link>
      </div>

      {error ? (
        <p
          className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          role="alert"
        >
          Couldn&apos;t start the job, try again
          <span className="mt-1 block text-xs opacity-80">{error}</span>
        </p>
      ) : null}

      {jobs.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-line bg-white px-4 py-10 text-center text-sm text-slate">
          No jobs yet. Start from the map (&quot;Start job&quot;) or create one
          manually.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                href={`/app/jobs/${job.id}`}
                prefetch
                className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-4 transition hover:border-purple/40"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold text-ink">
                    {job.customerName || job.siteAddress || "Untitled job"}
                  </p>
                  <p className="truncate text-xs text-slate">
                    {job.siteAddress || "No site address"} · Stage{" "}
                    {stageIndex(job.status)}/5
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-offwhite px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate">
                  {job.status.replace("_", " ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
