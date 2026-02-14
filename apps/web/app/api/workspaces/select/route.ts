import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ slug: z.string().min(2) });

export async function POST(req: Request) {
  const ct=req.headers.get("content-type")??"";
  const payload = ct.includes("application/json") ? await req.json() : Object.fromEntries(await req.formData());
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("if_workspace", parsed.data.slug, { path: "/", sameSite: "lax" });
  return res;
}
