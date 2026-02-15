import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/workspaces", "/onboarding", "/platform-admin", "/platform", "/org", "/app"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const user = request.cookies.get("if_user")?.value;
  const workspace = request.cookies.get("if_workspace")?.value;

  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  if (pathname === "/app" && user && !workspace) {
    return NextResponse.redirect(new URL("/workspaces", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/workspaces/:path*", "/org/:path*", "/onboarding/:path*", "/platform-admin/:path*", "/platform/:path*"]
};
