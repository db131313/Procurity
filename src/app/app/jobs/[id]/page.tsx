import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getProject } from "@/lib/db/store";
import { hasJobsAccess } from "@/lib/jobs/access";
import { getJobBundle } from "@/lib/jobs/store";
import { JobWorkflow } from "@/components/jobs/JobWorkflow";
import Link from "next/link";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasJobsAccess(user)) redirect("/app/jobs");

  const { id } = await params;
  const bundle = await getJobBundle(id, user.id);
  if (!bundle) notFound();

  let projectLabel: string | null = null;
  if (bundle.job.projectId) {
    const project = await getProject(bundle.job.projectId);
    projectLabel = project?.address ?? bundle.job.projectId;
  }

  return <JobWorkflow bundle={bundle} projectLabel={projectLabel} />;
}
