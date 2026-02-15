import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { requirePlatformApiUser } from "@/lib/hq/api-auth";
import { sendPlatformEmail } from "@/lib/mailer";

export async function POST(req: Request, { params }: { params: { meetingId: string } }) {
  const actor = await requirePlatformApiUser();
  if (!actor) return NextResponse.json({ ok: false }, { status: 403 });
  const meeting = await prisma.meeting.findUnique({ where: { id: params.meetingId }, include: { organization: true } });
  if (!meeting) return NextResponse.redirect(new URL("/hq/meetings", req.url));

  await sendPlatformEmail("admin@internflow.com", "Meeting reminder", `Reminder: ${meeting.title} for ${meeting.organization.name}`);
  await prisma.auditLog.create({ data: { scope: "PLATFORM", orgId: meeting.orgId, action: "HQ_MEETING_REMINDER_SENT", metadata: { meetingId: meeting.id } } });

  return NextResponse.redirect(new URL("/hq/meetings", req.url));
}
