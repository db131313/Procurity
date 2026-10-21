/**
 * Signed httpOnly cookie tracking which teaser project details an anonymous
 * visitor has opened. Cap: 3 distinct projects. TTL: 30 days.
 * Netlify-safe — cookie only, no disk writes.
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import {
  TEASER_FREE_VIEWS,
  TEASER_VIEW_COOKIE,
} from "./constants";

export { TEASER_FREE_VIEWS, TEASER_VIEW_COOKIE };

type Payload = {
  ids: string[];
};

const TTL_SECONDS = 60 * 60 * 24 * 30;

function secretKey(): Uint8Array {
  const raw =
    process.env.TEASER_VIEW_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    "procurity-teaser-view-dev-secret";
  return new TextEncoder().encode(raw);
}

export async function readTeaserViewIds(): Promise<string[]> {
  const jar = await cookies();
  const raw = jar.get(TEASER_VIEW_COOKIE)?.value;
  if (!raw) return [];
  try {
    const { payload } = await jwtVerify(raw, secretKey());
    const ids = (payload as Payload & Record<string, unknown>).ids;
    if (!Array.isArray(ids)) return [];
    return ids.filter((id): id is string => typeof id === "string").slice(0, 50);
  } catch {
    return [];
  }
}

export async function signTeaserViewIds(ids: string[]): Promise<string> {
  const unique = [...new Set(ids)].slice(0, TEASER_FREE_VIEWS);
  return new SignJWT({ ids: unique })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(secretKey());
}

export function attachTeaserViewCookie(
  response: NextResponse,
  token: string,
): void {
  response.cookies.set(TEASER_VIEW_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export function remainingFreeViews(ids: string[]): number {
  return Math.max(0, TEASER_FREE_VIEWS - ids.length);
}
