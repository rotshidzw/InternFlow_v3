import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

const schema = z.object({ action: z.enum(["APPROVED", "REJECTED"]), notes: z.string().optional() });

export async function POST(req: Request, { params }: { params: { orgId: string } }) {
  const email = cookies().get("if_user")?.value;
  if (!email) return NextResponse.json({ ok: false }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.role !== "SYSTEM_ADMIN") return NextResponse.json({ ok: false }, { status: 403 });

  const ct=req.headers.get("content-type")??"";
  const payload = ct.includes("application/json") ? await req.json() : Object.fromEntries(await req.formData());
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  await prisma.organization.update({
    where: { id: params.orgId },
    data: {
      status: parsed.data.action,
      rejectionReason: parsed.data.action === "REJECTED" ? parsed.data.notes ?? "Rejected by platform admin" : null
    }
  });

  if (!ct.includes("application/json")) {
    return NextResponse.redirect(new URL("/platform-admin", req.url));
  }

  return NextResponse.json({ ok: true });
}
