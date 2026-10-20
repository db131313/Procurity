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
  if (!hasJobsAccess(user)) redirect("/app/jobs");

  const { projectId } = await searchParams;
  if (projectId?.trim()) {
    await startJobFromProject(projectId.trim());
  } else {
    await startBlankJob();
  }
}
