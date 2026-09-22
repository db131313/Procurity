import { redirect } from "next/navigation";

/** App-shell alias → canonical promo admin tool. */
export default function AppAdminPromosRedirect() {
  redirect("/admin/promos");
}
