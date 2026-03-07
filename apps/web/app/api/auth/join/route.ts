import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ token: z.string().min(6) });

export async function POST(req: Request) {
  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid token payload" },
      { status: 400 },
    );
  }

  const email = cookies().get("if_user")?.value;
  if (!email) {
    return NextResponse.json(
      { ok: false, error: "Please login first" },
      { status: 401 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Account not found" },
      { status: 404 },
    );
  }

  const inviteToken = await prisma.inviteToken.findUnique({
    where: { token: body.data.token },
    include: { tenant: true },
  });

  if (!inviteToken) {
    await prisma.auditEvent.create({
      data: {
        userId: user.id,
        action: "INVITE_JOIN_FAILED",
        entityType: "InviteToken",
        entityId: body.data.token,
        metadata: { reason: "NOT_FOUND" },
      },
    });
    return NextResponse.json(
      { ok: false, error: "Invite token not found" },
      { status: 404 },
    );
  }

  if (inviteToken.expiresAt < new Date()) {
    await prisma.auditEvent.create({
      data: {
        tenantId: inviteToken.tenantId,
        userId: user.id,
        action: "INVITE_JOIN_FAILED",
        entityType: "InviteToken",
        entityId: inviteToken.id,
        metadata: { reason: "EXPIRED" },
      },
    });
    return NextResponse.json(
      { ok: false, error: "Invite token expired" },
      { status: 400 },
    );
  }


  if (inviteToken.role !== "LEARNER") {
    return NextResponse.json({ ok: false, error: "Token role unsupported" }, { status: 400 });
  }

  const existingMembership = await prisma.membership.findFirst({
    where: { userId: user.id, organizationId: inviteToken.tenantId },
  });

  if (existingMembership && existingMembership.role !== "STUDENT") {
    return NextResponse.json(
      { ok: false, error: "This token is for learners only. Use workspace login for staff roles." },
      { status: 409 },
    );
  }

  if (inviteToken.usedCount >= inviteToken.maxUses) {
    await prisma.auditEvent.create({
      data: {
        tenantId: inviteToken.tenantId,
        userId: user.id,
        action: "INVITE_JOIN_FAILED",
        entityType: "InviteToken",
        entityId: inviteToken.id,
        metadata: { reason: "MAX_USES_REACHED" },
      },
    });
    return NextResponse.json(
      { ok: false, error: "Invite token is no longer available" },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    if (!existingMembership) {
      await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: inviteToken.tenantId,
          role: "STUDENT",
        },
      });
    }

    if (inviteToken.programmeId) {
      const existingEnrollment = await tx.enrollment.findFirst({
        where: { userId: user.id, programId: inviteToken.programmeId },
      });

      if (existingEnrollment) {
        await tx.enrollment.update({
          where: { id: existingEnrollment.id },
          data: { organizationId: inviteToken.tenantId },
        });
      } else {
        await tx.enrollment.create({
          data: {
            userId: user.id,
            programId: inviteToken.programmeId,
            organizationId: inviteToken.tenantId,
            status: "PENDING",
          },
        });
      }
    }

    await tx.inviteToken.update({
      where: { id: inviteToken.id },
      data: { usedCount: { increment: 1 } },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: inviteToken.tenantId,
        userId: user.id,
        action: "INVITE_JOIN_SUCCESS",
        entityType: "InviteToken",
        entityId: inviteToken.id,
        metadata: {
          tenantSlug: inviteToken.tenant.slug,
          programmeId: inviteToken.programmeId,
        },
      },
    });
  });

  const redirectTo = `/org/${inviteToken.tenant.slug}/student`;
  const res = NextResponse.json({ ok: true, redirectTo });
  res.cookies.set("if_workspace", inviteToken.tenant.slug, {
    sameSite: "lax",
    path: "/",
  });
  return res;
}
