/**
 * Mobile API auth: Firebase ID token in Authorization: Bearer header.
 * Reuses verifyFirebaseIdToken + user upsert (same as web session exchange).
 */

import { NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/firebase/verify-id-token";
import {
  getUserByFirebaseUid,
  upsertUser,
} from "@/lib/db/store";
import { withEffectivePlan, type UserRecord } from "@/lib/db/types";
import { hasJobsAccess } from "@/lib/jobs/access";

export type MobileAuthOk = { ok: true; user: UserRecord };
export type MobileAuthErr = {
  ok: false;
  response: NextResponse;
};

export async function requireMobileJobsUser(
  request: Request,
): Promise<MobileAuthOk | MobileAuthErr> {
  const header = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match?.[1]) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Missing Authorization: Bearer <Firebase ID token>" },
        { status: 401 },
      ),
    };
  }

  let verified;
  try {
    verified = await verifyFirebaseIdToken(match[1]);
  } catch (e) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            e instanceof Error ? e.message : "Invalid Firebase ID token",
        },
        { status: 401 },
      ),
    };
  }

  let user =
    (await getUserByFirebaseUid(verified.uid)) ??
    (await upsertUser({
      firebaseUid: verified.uid,
      email: verified.email,
      name: verified.name ?? null,
    }));
  user = withEffectivePlan(user);

  if (!hasJobsAccess(user)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Jobs requires a paid plan" },
        { status: 403 },
      ),
    };
  }

  return { ok: true, user };
}
