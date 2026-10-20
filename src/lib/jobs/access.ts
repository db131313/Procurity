import type { PlanTier, UserRecord } from "@/lib/db/types";
import { isDemoUserEmail } from "@/lib/db/types";

/** Paid plans that unlock the Jobs workflow. */
const PAID_PLANS: PlanTier[] = ["starter", "growth", "pro"];

export function hasJobsAccess(
  user: Pick<UserRecord, "plan" | "email"> | null | undefined,
): boolean {
  if (!user) return false;
  if (isDemoUserEmail(user.email)) return true;
  return PAID_PLANS.includes(user.plan);
}
