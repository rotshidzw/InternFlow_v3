import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { requirePlatformApiUser } from "@/lib/hq/api-auth";
import { getTenantContactEmails } from "@/lib/hq/tenant-contacts";
import { sendPlatformEmailMany } from "@/lib/mailer";

export async function POST(req: Request) {
  const actor = await requirePlatformApiUser();
  if (!actor) return NextResponse.json({ ok: false }, { status: 403 });

  const form = await req.formData();
  const title = String(form.get("title") ?? "");
  const orgId = String(form.get("orgId") ?? "");
  const startAt = new Date(String(form.get("startAt") ?? ""));
  const endAt = new Date(String(form.get("endAt") ?? ""));

  await prisma.meeting.create({
    data: {
      title,
      orgId,
      startAt,
      endAt,
      meetingUrl: String(form.get("meetingUrl") ?? "") || null,
      agenda: String(form.get("agenda") ?? "") || null,
      notes: String(form.get("notes") ?? "") || null,
      createdBy: actor.user.id
    }
  });

  const recipients = await getTenantContactEmails(orgId);
  await sendPlatformEmailMany(recipients, `Meeting scheduled: ${title}`, `A meeting has been scheduled from ${startAt.toISOString()} to ${endAt.toISOString()}. Link: ${String(form.get("meetingUrl") ?? "TBD")}`);

  await prisma.auditLog.create({ data: { scope: "PLATFORM", actorUserId: actor.user.id, orgId, action: "HQ_MEETING_CREATED", metadata: { recipients } } });
  return NextResponse.redirect(new URL("/hq/meetings", req.url));
}
