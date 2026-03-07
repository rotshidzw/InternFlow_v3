import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ token: z.string().min(6) });

function wantsJson(req: Request) {
  const accept = req.headers.get("accept") ?? "";
  const contentType = req.headers.get("content-type") ?? "";
  return (
    accept.includes("application/json") ||
    contentType.includes("application/json")
  );
}

function redirectResponse(status: "notice" | "error", value: string) {
  const url = new URL(
    "/app/student",
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  );
  url.searchParams.set(status, value);
  return NextResponse.redirect(url);
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  let tokenPayload: unknown;
  if (contentType.includes("application/json")) {
    tokenPayload = await req.json();
  } else {
    const form = await req.formData();
    tokenPayload = { token: form.get("token") };
  }

  const body = schema.safeParse(tokenPayload);
  if (!body.success) {
    if (!wantsJson(req))
      return redirectResponse("error", "invalid-invite-token");
    return NextResponse.json(
      { ok: false, error: "Invalid token payload" },
      { status: 400 },
    );
  }

  const email = cookies().get("if_user")?.value;
  if (!email) {
    if (!wantsJson(req)) return redirectResponse("error", "login-required");
    return NextResponse.json(
      {
        ok: false,
        error:
          "Login required, or complete profile onboarding with this invite token.",
      },
      { status: 401 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user) {
    if (!wantsJson(req)) return redirectResponse("error", "account-not-found");
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
    if (!wantsJson(req)) return redirectResponse("error", "invite-not-found");
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
    if (!wantsJson(req)) return redirectResponse("error", "invite-expired");
    return NextResponse.json(
      { ok: false, error: "Invite token expired" },
      { status: 400 },
    );
  }

  if (inviteToken.role !== "LEARNER") {
    if (!wantsJson(req))
      return redirectResponse("error", "invite-role-unsupported");
    return NextResponse.json(
      { ok: false, error: "Token role unsupported" },
      { status: 400 },
    );
  }

  const existingMembership = await prisma.membership.findFirst({
    where: { userId: user.id, organizationId: inviteToken.tenantId },
  });

  if (existingMembership && existingMembership.role !== "STUDENT") {
    if (!wantsJson(req))
      return redirectResponse("error", "staff-membership-conflict");
    return NextResponse.json(
      {
        ok: false,
        error:
          "This token is for learners only. Use workspace login for staff roles.",
      },
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
    if (!wantsJson(req)) return redirectResponse("error", "invite-maxed");
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
  const res = wantsJson(req)
    ? NextResponse.json({ ok: true, redirectTo })
    : redirectResponse("notice", "invite-joined");
  res.cookies.set("if_workspace", inviteToken.tenant.slug, {
    sameSite: "lax",
    path: "/",
  });
  return res;
}
