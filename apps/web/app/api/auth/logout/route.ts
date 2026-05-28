import { NextResponse } from "next/server";
import { clearAuthenticatedSessionCookies } from "@/lib/auth-session";

export async function POST(req: Request) {
  const response = NextResponse.redirect(new URL("/auth", req.url));
  clearAuthenticatedSessionCookies(response);

  return response;
}
