import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const response = NextResponse.redirect(new URL("/auth", req.url));

  response.cookies.set("if_user", "", { expires: new Date(0), path: "/" });
  response.cookies.set("if_workspace", "", { expires: new Date(0), path: "/" });
  response.cookies.set("if_impersonation", "", { expires: new Date(0), path: "/" });

  return response;
}
