import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ status: z.enum(["SHORTLISTED", "ACCEPTED", "REJECTED"]) });

export async function POST(req: Request, { params }: { params: { applicationId: string } }) {
  const payload = Object.fromEntries(await req.formData());
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  await prisma.application.update({ where: { id: params.applicationId }, data: { status: parsed.data.status } });
  return NextResponse.redirect(new URL(req.headers.get("referer") ?? "/workspaces", req.url));
}
