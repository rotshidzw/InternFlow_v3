import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { requirePlatformApiUser } from "@/lib/hq/api-auth";

export async function POST(req: Request) {
  const actor = await requirePlatformApiUser();
  if (!actor) return NextResponse.json({ ok: false }, { status: 403 });

  const form = await req.formData();
  const reminderHours = Number(form.get("meetingReminderHours") ?? 24);
  const defaultAgenda = String(form.get("defaultAgenda") ?? "");

  const existing = await prisma.settings.findFirst({ where: { organizationId: null, key: "hq_meeting_defaults" } });
  if (existing) {
    await prisma.settings.update({ where: { id: existing.id }, data: { value: { reminderHours, defaultAgenda } } });
  } else {
    await prisma.settings.create({ data: { organizationId: null, key: "hq_meeting_defaults", value: { reminderHours, defaultAgenda } } });
  }

  await prisma.auditLog.create({
    data: {
      scope: "PLATFORM",
      actorUserId: actor.user.id,
      action: "HQ_SETTINGS_UPDATED",
      metadata: { reminderHours }
    }
  });

  return NextResponse.redirect(new URL("/hq/settings", req.url));
}
