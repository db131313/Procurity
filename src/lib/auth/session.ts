import { cookies } from "next/headers";
import { getDemoUser, getUserByFirebaseUid, upsertUser } from "@/lib/db/store";
import type { UserRecord } from "@/lib/db/types";

export const SESSION_COOKIE = "pc_session";

export type SessionPayload = {
  uid: string;
  email: string;
  name?: string;
  demo?: boolean;
};

function encode(payload: SessionPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decode(raw: string): SessionPayload | null {
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(payload: SessionPayload) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, encode(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return decode(raw);
}

export async function getCurrentUser(): Promise<UserRecord | null> {
  const session = await getSession();
  if (!session) return null;
  if (session.demo) return getDemoUser();
  const user = await getUserByFirebaseUid(session.uid);
  if (user) return user;
  return upsertUser({
    firebaseUid: session.uid,
    email: session.email,
    name: session.name ?? null,
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  return user;
}
