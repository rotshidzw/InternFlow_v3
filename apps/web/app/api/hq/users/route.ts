import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { requirePlatformApiUserWithRole } from "@/lib/hq/api-auth";
import { PlatformRole, Role } from "@prisma/client";

const ALLOWED_ROLES = new Set(Object.values(PlatformRole));

export async function POST(req: Request) {
  const actor = await requirePlatformApiUserWithRole(["PLATFORM_ADMIN"]);
  if (!actor) return NextResponse.json({ ok: false }, { status: 403 });

  const form = await req.formData();
  const action = String(form.get("action") ?? "assign");

  if (action === "create") {
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const name = String(form.get("name") ?? "").trim();
    const role = String(form.get("role") ?? "PLATFORM_SUPPORT");

    if (!email.endsWith("@internflow.com") || !ALLOWED_ROLES.has(role as PlatformRole)) {
      return NextResponse.redirect(new URL("/hq/users", req.url));
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: { name: name || undefined },
      create: { email, name: name || undefined, role: Role.SYSTEM_ADMIN }
    });

    await prisma.platformMembership.upsert({
      where: { userId_role: { userId: user.id, role: role as PlatformRole } },
      update: {},
      create: { userId: user.id, role: role as PlatformRole }
    });

    await prisma.auditLog.create({ data: { scope: "PLATFORM", actorUserId: actor.user.id, action: "HQ_PLATFORM_USER_CREATED", metadata: { userId: user.id, email, role } } });

    return NextResponse.redirect(new URL("/hq/users", req.url));
  }

  if (action === "deleteMembership") {
    const membershipId = String(form.get("membershipId") ?? "");
    if (membershipId) {
      await prisma.platformMembership.delete({ where: { id: membershipId } }).catch(() => null);
      await prisma.auditLog.create({ data: { scope: "PLATFORM", actorUserId: actor.user.id, action: "HQ_ROLE_REMOVED", metadata: { membershipId } } });
    }
    return NextResponse.redirect(new URL("/hq/users", req.url));
  }

  const userId = String(form.get("userId") ?? "");
  const role = String(form.get("role") ?? "PLATFORM_SUPPORT");
  if (!ALLOWED_ROLES.has(role as PlatformRole)) {
    return NextResponse.redirect(new URL("/hq/users", req.url));
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || !target.email.endsWith("@internflow.com")) {
    return NextResponse.redirect(new URL("/hq/users", req.url));
  }

  await prisma.platformMembership.upsert({
    where: { userId_role: { userId, role: role as PlatformRole } },
    update: {},
    create: { userId, role: role as PlatformRole }
  });

  await prisma.auditLog.create({ data: { scope: "PLATFORM", actorUserId: actor.user.id, action: "HQ_ROLE_ASSIGNED", metadata: { userId, role } } });

  return NextResponse.redirect(new URL("/hq/users", req.url));
}
