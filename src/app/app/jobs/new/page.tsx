import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasJobsAccess } from "@/lib/jobs/access";
import { startBlankJob, startJobFromProject } from "@/app/actions/jobs";

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasJobsAccess(user)) redirect("/app/billing");

  const { projectId } = await searchParams;
  const result = projectId?.trim()
    ? await startJobFromProject(projectId.trim())
    : await startBlankJob();

  // Success path redirects inside the action and never returns.
  if (result && result.ok === false) {
    if (result.error === "Unauthorized") redirect("/login");
    if (result.error === "Jobs requires a paid plan") redirect("/app/billing");
    redirect(`/app/jobs?error=${encodeURIComponent(result.error)}`);
  }

  redirect("/app/jobs");
}
