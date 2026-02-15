import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { requirePlatformApiUser } from "@/lib/hq/api-auth";

export async function POST(req: Request) {
  const actor = await requirePlatformApiUser();
  if (!actor) return NextResponse.json({ ok: false }, { status: 403 });
  const form = await req.formData();
  const userId = String(form.get("userId") ?? "");
  const role = String(form.get("role") ?? "PLATFORM_SUPPORT");

  await prisma.platformMembership.upsert({
    where: { userId_role: { userId, role: role as any } },
    update: {},
    create: { userId, role: role as any }
  });

  await prisma.auditLog.create({ data: { scope: "PLATFORM", actorUserId: actor.user.id, action: "HQ_ROLE_ASSIGNED", metadata: { userId, role } } });

  return NextResponse.redirect(new URL("/hq/users", req.url));
}
