import { redirect } from "next/navigation";

/** App-shell alias → canonical internal admin tool. */
export default function AppAdminDevPlanRedirect() {
  redirect("/admin/dev-plan");
}
