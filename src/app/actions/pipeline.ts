"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import {
  addToPipeline,
  movePipelineItem,
  listPipeline,
} from "@/lib/db/store";
import type { PipelineStage } from "@/lib/db/types";

export async function addProjectToPipeline(projectId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const item = await addToPipeline(user.id, projectId);
  revalidatePath("/app/pipeline");
  revalidatePath(`/app/project/${projectId}`);
  return item;
}

export async function movePipelineStage(
  itemId: string,
  stage: PipelineStage,
  projectId?: string,
) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const owned = (await listPipeline(user.id)).find((p) => p.id === itemId);
  if (!owned) return { error: "Not found" as const };

  await movePipelineItem(itemId, stage);
  revalidatePath("/app/pipeline");
  if (projectId) revalidatePath(`/app/project/${projectId}`);

  if (stage === "won") {
    redirect(`/app/deal/${encodeURIComponent(owned.projectId)}/won`);
  }
  return { ok: true as const };
}

export async function addAndMaybeRedirect(formData: FormData): Promise<void> {
  const projectId = String(formData.get("projectId") || "");
  if (!projectId) return;
  await addProjectToPipeline(projectId);
}
