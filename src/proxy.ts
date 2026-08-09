import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const isLoggedIn = Boolean(req.auth);
  const path = req.nextUrl.pathname;
  const isAuthPage = path.startsWith("/signin") || path.startsWith("/signup");
  const isProtected =
    path.startsWith("/dashboard") || path.startsWith("/api/intel");

  if (isProtected && !isLoggedIn) {
    const url = new URL("/signin", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/signin", "/signup", "/api/intel/:path*"],
};
