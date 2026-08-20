import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

/** If already signed in, send users into the app (not handled by proxy). */
export async function redirectIfAuthenticated(to = "/app/home") {
  const session = await getSession();
  if (session) redirect(to);
}
