import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const protectedPaths = ["/dashboard", "/accounts", "/checkin", "/profile"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isProtected = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isProtected && !req.auth) {
    const signInUrl = new URL("/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|game-icons|.*\\.svg$).*)"],
};
