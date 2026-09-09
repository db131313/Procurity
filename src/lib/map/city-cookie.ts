import { cookies } from "next/headers";

export const CITY_COOKIE = "pc_city";

/** Persist preferred map metro (extends defaultCity / ?city= pattern). */
export async function setCityCookie(city: string) {
  const jar = await cookies();
  jar.set(CITY_COOKIE, city, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
