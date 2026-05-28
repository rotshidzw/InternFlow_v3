import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import {
  TENANT_ROLE_GROUPS,
  resolveTenantApiActor,
  tenantApiAuthErrorResponse,
} from "@/lib/tenant-api-auth";

export async function POST(req: Request, { params }: { params: { orgSlug: string } }) {
  const actor = await resolveTenantApiActor({
    orgSlug: params.orgSlug,
    allowedRoles: TENANT_ROLE_GROUPS.APP_REVIEW,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const contentType = req.headers.get("content-type") ?? "";
  let learnerId = "";
  let body = "";

  if (contentType.includes("application/json")) {
    const payload = (await req.json()) as { learnerId?: string; body?: string };
    learnerId = payload.learnerId ?? "";
    body = payload.body ?? "";
  } else {
    const formData = await req.formData();
    learnerId = String(formData.get("learnerId") ?? "");
    body = String(formData.get("body") ?? "");
  }

  if (!learnerId || !body.trim()) {
    return NextResponse.json({ error: "learnerId and body are required" }, { status: 400 });
  }

  const learnerMembership = await prisma.membership.findFirst({
    where: {
      userId: learnerId,
      organizationId: actor.actor.membership.organizationId,
      role: "STUDENT",
    },
  });
  if (!learnerMembership) return NextResponse.json({ error: "Learner not in organization" }, { status: 404 });

  let thread = await prisma.chatThread.findFirst({ where: { userId: learnerId } });
  if (!thread) {
    thread = await prisma.chatThread.create({ data: { userId: learnerId, title: `Tenant learner thread` } });
  }

  const message = await prisma.chatMessage.create({
    data: {
      threadId: thread.id,
      senderId: actor.actor.user.id,
      role: actor.actor.membership.role,
      body: body.trim(),
    },
  });

  await prisma.$transaction([
    prisma.notification.create({
      data: {
        userId: learnerId,
        title: "New message from your organization",
        body: body.trim().slice(0, 240),
      },
    }),
    prisma.auditEvent.create({
      data: {
        tenantId: actor.actor.membership.organizationId,
        userId: actor.actor.user.id,
        action: "TENANT_MESSAGE_SENT",
        entityType: "ChatThread",
        entityId: thread.id,
        metadata: { learnerId, messageId: message.id },
      },
    }),
  ]);

  if (!contentType.includes("application/json")) {
    return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/learner-chat`, req.url));
  }

  return NextResponse.json({ ok: true, messageId: message.id });
}
