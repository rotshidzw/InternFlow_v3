import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ALLOWED_ROLES = new Set(["PROVIDER_ADMIN", "COORDINATOR"]);

function tokenString() {
  return `if_inv_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export async function POST(
  req: Request,
  { params }: { params: { orgSlug: string } },
) {
  const email = cookies().get("if_user")?.value;
  if (!email) return NextResponse.redirect(new URL("/auth", req.url));

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user) return NextResponse.redirect(new URL("/auth", req.url));

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, organization: { slug: params.orgSlug } },
    include: { organization: true },
  });

  if (!membership || !ALLOWED_ROLES.has(membership.role)) {
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 },
    );
  }

  const form = await req.formData();
  const maxUsesRaw = Number(form.get("maxUses") ?? 1);
  const daysRaw = Number(form.get("expiresInDays") ?? 14);
  const programmeId = String(form.get("programmeId") ?? "").trim() || null;

  const maxUses =
    Number.isFinite(maxUsesRaw) && maxUsesRaw > 0
      ? Math.min(maxUsesRaw, 500)
      : 1;
  const expiresInDays =
    Number.isFinite(daysRaw) && daysRaw > 0 ? Math.min(daysRaw, 90) : 14;

  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  const invite = await prisma.inviteToken.create({
    data: {
      token: tokenString(),
      tenantId: membership.organizationId,
      programmeId,
      role: "LEARNER",
      expiresAt,
      maxUses,
      createdByUserId: user.id,
    },
  });

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const inviteLink = `${appUrl}/auth/setup?mode=join&token=${invite.token}`;

  await prisma.auditEvent.create({
    data: {
      tenantId: membership.organizationId,
      userId: user.id,
      action: "INVITE_CREATED",
      entityType: "InviteToken",
      entityId: invite.id,
      metadata: { maxUses, expiresInDays, programmeId, inviteLink },
    },
  });

  return NextResponse.redirect(
    new URL(
      `/org/${params.orgSlug}/app/staff?inviteLink=${encodeURIComponent(inviteLink)}`,
      req.url,
    ),
  );
}
