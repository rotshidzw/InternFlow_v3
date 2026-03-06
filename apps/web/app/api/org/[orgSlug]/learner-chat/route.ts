import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { getOrgAccess } from "@/lib/org-access";

export async function POST(req: Request, { params }: { params: { orgSlug: string } }) {
  const access = await getOrgAccess(params.orgSlug);
  if ("error" in access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const membership = await prisma.membership.findFirst({ where: { userId: learnerId, organizationId: access.membership.organizationId } });
  if (!membership) return NextResponse.json({ error: "Learner not in organization" }, { status: 404 });

  let thread = await prisma.chatThread.findFirst({ where: { userId: learnerId } });
  if (!thread) {
    thread = await prisma.chatThread.create({ data: { userId: learnerId, title: `Coordinator thread ${learnerId}` } });
  }

  const message = await prisma.chatMessage.create({
    data: {
      threadId: thread.id,
      senderId: access.user.id,
      role: "COORDINATOR",
      body: body.trim()
    }
  });

  if (!contentType.includes("application/json")) {
    return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/learner-chat`, req.url));
  }

  return NextResponse.json({ ok: true, messageId: message.id });
}
