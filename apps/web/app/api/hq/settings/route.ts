import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { requirePlatformApiUserWithRole } from "@/lib/hq/api-auth";

async function upsertGlobalSetting(key: string, value: unknown) {
  const existing = await prisma.settings.findFirst({ where: { organizationId: null, key } });
  if (existing) {
    await prisma.settings.update({ where: { id: existing.id }, data: { value } });
  } else {
    await prisma.settings.create({ data: { organizationId: null, key, value } });
  }
}

export async function POST(req: Request) {
  const actor = await requirePlatformApiUserWithRole(["PLATFORM_ADMIN", "PLATFORM_OPS"]);
  if (!actor) return NextResponse.json({ ok: false }, { status: 403 });

  const form = await req.formData();

  const reminderHours = Number(form.get("meetingReminderHours") ?? 24);
  const defaultAgenda = String(form.get("defaultAgenda") ?? "");
  const autoAssignSupport = String(form.get("autoAssignSupport") ?? "on") === "on";
  const escalationHours = Number(form.get("escalationHours") ?? 24);
  const allowSelfServeOnboarding = String(form.get("allowSelfServeOnboarding") ?? "on") === "on";
  const defaultTenantStatus = String(form.get("defaultTenantStatus") ?? "PENDING_REVIEW");

  await upsertGlobalSetting("hq_meeting_defaults", { reminderHours, defaultAgenda });
  await upsertGlobalSetting("hq_support_policy", { autoAssignSupport, escalationHours });
  await upsertGlobalSetting("hq_platform_policy", { allowSelfServeOnboarding, defaultTenantStatus });

  await prisma.auditLog.create({
    data: {
      scope: "PLATFORM",
      actorUserId: actor.user.id,
      action: "HQ_SETTINGS_UPDATED",
      metadata: { reminderHours, escalationHours, defaultTenantStatus }
    }
  });

  return NextResponse.redirect(new URL("/hq/settings", req.url));
}
