import { orgSetupSchema } from "@internflow/shared/src/schemas";
import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export async function POST(req: Request) {
  const actor = await getCurrentUser();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const parsed = orgSetupSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.mode === "create" && parsed.data.orgName) {
    const slug = `${parsed.data.orgName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
    const org = await prisma.organization.create({
      data: {
        name: parsed.data.orgName,
        slug,
        status: "PENDING_REVIEW",
        createdBy: actor.id,
      },
    });

    await prisma.membership.upsert({
      where: {
        userId_organizationId: {
          userId: actor.id,
          organizationId: org.id,
        },
      },
      update: { role: "PROVIDER_ADMIN" },
      create: {
        userId: actor.id,
        organizationId: org.id,
        role: "PROVIDER_ADMIN",
      },
    });

    await prisma.auditEvent.create({
      data: {
        tenantId: org.id,
        userId: actor.id,
        action: "ORG_SETUP_CREATE_REQUESTED",
        entityType: "Organization",
        entityId: org.id,
        metadata: { slug },
      },
    });

    return NextResponse.json({ ok: true, orgId: org.id, orgSlug: org.slug });
  }

  if (parsed.data.mode === "join" && parsed.data.inviteToken) {
    const invite = await prisma.invite.findUnique({ where: { token: parsed.data.inviteToken } });
    if (!invite) return NextResponse.json({ error: "Invalid invite" }, { status: 404 });

    const actorEmail = actor.email.toLowerCase();
    const inviteEmail = invite.email.toLowerCase();
    if (inviteEmail !== actorEmail && actor.role !== "SYSTEM_ADMIN") {
      return NextResponse.json(
        { ok: false, error: "Invite token does not match the signed-in account" },
        { status: 403 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.membership.upsert({
        where: {
          userId_organizationId: {
            userId: actor.id,
            organizationId: invite.organizationId,
          },
        },
        update: { role: invite.role },
        create: {
          userId: actor.id,
          organizationId: invite.organizationId,
          role: invite.role,
        },
      });

      await tx.invite.update({
        where: { id: invite.id },
        data: { acceptedAt: invite.acceptedAt ?? new Date() },
      });

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "INVITE_ACCEPTED",
          metadata: {
            inviteId: invite.id,
            role: invite.role,
            organizationId: invite.organizationId,
          },
        },
      });
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid setup payload" }, { status: 400 });
}
