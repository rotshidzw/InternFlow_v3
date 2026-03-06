import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ALLOWED_ROLES = new Set(["PROVIDER_ADMIN", "COORDINATOR", "SUPERVISOR"]);

export async function POST(
  req: Request,
  { params }: { params: { orgSlug: string } },
) {
  const email = cookies().get("if_user")?.value;
  if (!email) return NextResponse.redirect(new URL("/auth", req.url));

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return NextResponse.redirect(new URL("/auth", req.url));

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, organization: { slug: params.orgSlug } },
  });

  if (!membership || !ALLOWED_ROLES.has(membership.role)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const userId = String(form.get("userId") ?? "").trim();
  const title = String(form.get("title") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();

  if (!userId || !title || !body) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }

  const receiverMembership = await prisma.membership.findFirst({
    where: { userId, organizationId: membership.organizationId },
  });

  if (!receiverMembership) {
    return NextResponse.json({ ok: false, error: "User not in tenant" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.notification.create({ data: { userId, title, body } }),
    prisma.auditEvent.create({
      data: {
        tenantId: membership.organizationId,
        userId: user.id,
        action: "NOTIFICATION_SENT",
        entityType: "User",
        entityId: userId,
        metadata: { title },
      },
    }),
  ]);

  return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/notifications`, req.url));
}
