import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const protectedPagePaths = ["/dashboard", "/accounts", "/checkin", "/profile"];
const protectedApiPaths = ["/api/user", "/api/checkin", "/api/agent"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isProtectedPage = protectedPagePaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  const isProtectedApi = protectedApiPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isProtectedPage && !req.auth) {
    const signInUrl = new URL("/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (isProtectedApi && !req.auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|game-icons|.*\\.svg$).*)",
  ],
};
