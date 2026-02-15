import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const payload = schema.safeParse(await req.json());
  if (!payload.success) return NextResponse.json({ ok: false }, { status: 400 });
  const res = NextResponse.json({ ok: true, redirectTo: "/workspaces" });
  res.cookies.set("if_user", payload.data.email.toLowerCase(), { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}
