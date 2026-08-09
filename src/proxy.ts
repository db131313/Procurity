import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const isLoggedIn = Boolean(req.auth);
  const path = req.nextUrl.pathname;
  const isAuthPage = path.startsWith("/signin") || path.startsWith("/signup");

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/map", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/signin", "/signup"],
};
