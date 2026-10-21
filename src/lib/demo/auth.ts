import { isAdminEmail } from "@/lib/auth/admin";
import { getSession } from "@/lib/auth/session";
import { isDemoUserEmail } from "@/lib/db/types";

/** Live demo (?live=1) — admin or built-in demo user only. */
export async function canAccessLiveDemo(): Promise<{
  ok: boolean;
  email?: string;
}> {
  const session = await getSession();
  if (!session?.email) return { ok: false };
  if (isAdminEmail(session.email) || isDemoUserEmail(session.email)) {
    return { ok: true, email: session.email };
  }
  return { ok: false };
}

export async function requireAdminOrDemo(): Promise<{
  ok: boolean;
  email?: string;
}> {
  return canAccessLiveDemo();
}
