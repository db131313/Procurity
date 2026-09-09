"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/auth/admin";
import { getSession } from "@/lib/auth/session";
import { getUserByFirebaseUid, setDevPlanOverride } from "@/lib/db/store";
import type { PlanTier } from "@/lib/db/types";

const ALLOWED: PlanTier[] = ["starter", "growth", "pro"];

export async function setOwnDevPlanOverride(formData: FormData) {
  const session = await getSession();
  if (!session || session.demo) {
    redirect("/login?next=/admin/dev-plan");
  }
  if (!isAdminEmail(session.email)) {
    redirect("/admin/dev-plan?error=forbidden");
  }

  const raw = await getUserByFirebaseUid(session.uid);
  if (!raw) {
    redirect("/admin/dev-plan?error=not_found");
  }

  const value = String(formData.get("plan") || "").trim().toLowerCase();
  let override: PlanTier | null = null;
  if (value && value !== "none") {
    if (!ALLOWED.includes(value as PlanTier)) {
      redirect("/admin/dev-plan?error=invalid");
    }
    override = value as PlanTier;
  }

  await setDevPlanOverride(raw.id, override);
  revalidatePath("/admin/dev-plan");
  revalidatePath("/app", "layout");
  redirect("/admin/dev-plan?ok=1");
}
