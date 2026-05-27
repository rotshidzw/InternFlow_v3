import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireTenantApiActor } from "@/lib/tenant-api-auth";

const ALLOWED_ROLES = ["PROVIDER_ADMIN", "COORDINATOR"] as const;

function tokenString() {
  return `if_inv_${randomBytes(8).toString("hex")}${Date.now().toString(36)}`;
}

export async function POST(
  req: Request,
  { params }: { params: { orgSlug: string } },
) {
  const actor = await requireTenantApiActor(params.orgSlug, [...ALLOWED_ROLES]);
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const maxUsesRaw = Number(form.get("maxUses") ?? 1);
  const daysRaw = Number(form.get("expiresInDays") ?? 14);
  const programmeId = String(form.get("programmeId") ?? "").trim() || null;

  const maxUses = Number.isFinite(maxUsesRaw) && maxUsesRaw > 0 ? Math.min(maxUsesRaw, 500) : 1;
  const expiresInDays = Number.isFinite(daysRaw) && daysRaw > 0 ? Math.min(daysRaw, 90) : 14;

  if (programmeId) {
    const programme = await prisma.program.findFirst({
      where: { id: programmeId, organizationId: actor.membership.organizationId },
    });
    if (!programme) {
      return NextResponse.json({ ok: false, error: "Programme not found in tenant" }, { status: 400 });
    }
  }

  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  const invite = await prisma.inviteToken.create({
    data: {
      token: tokenString(),
      tenantId: actor.membership.organizationId,
      programmeId,
      role: "LEARNER",
      expiresAt,
      maxUses,
      createdByUserId: actor.user.id,
    },
  });

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const inviteLink = `${appUrl}/auth/setup?mode=join&token=${invite.token}`;

  await prisma.auditEvent.create({
    data: {
      tenantId: actor.membership.organizationId,
      userId: actor.user.id,
      action: "INVITE_CREATED",
      entityType: "InviteToken",
      entityId: invite.id,
      metadata: { maxUses, expiresInDays, programmeId, inviteLink },
    },
  });

  return NextResponse.redirect(
    new URL(`/org/${params.orgSlug}/app/intakes?inviteLink=${encodeURIComponent(inviteLink)}`, req.url),
  );
}
