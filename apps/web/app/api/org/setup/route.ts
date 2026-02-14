import { orgSetupSchema } from "@internflow/shared/src/schemas";
import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

export async function POST(req: Request) {
  const parsed = orgSetupSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.mode === "create" && parsed.data.orgName) {
    const org = await prisma.organization.create({ data: { name: parsed.data.orgName, slug: `${parsed.data.orgName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}` } });
    return NextResponse.json({ ok: true, orgId: org.id });
  }

  if (parsed.data.mode === "join" && parsed.data.inviteToken) {
    const invite = await prisma.invite.findUnique({ where: { token: parsed.data.inviteToken } });
    if (!invite) return NextResponse.json({ error: "Invalid invite" }, { status: 404 });
    await prisma.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
    await prisma.auditLog.create({ data: { action: "INVITE_ACCEPTED", metadata: { inviteId: invite.id, role: Role.STUDENT } } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid setup payload" }, { status: 400 });
}
