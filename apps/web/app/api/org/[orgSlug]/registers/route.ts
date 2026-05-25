import { prisma } from "@internflow/db/src";
import { getStorageAdapter } from "@internflow/shared/src/storage";
import { NextResponse } from "next/server";
import {
  REGISTER_TYPES,
  serializeAttendanceRegisterMetadata,
  type AttendanceRegisterMetadata,
  parseAttendanceRegisterMetadata,
} from "@/lib/provider-operations";
import {
  TENANT_ROLE,
  TENANT_ROLE_GROUPS,
  resolveTenantApiActor,
  tenantApiAuthErrorResponse,
} from "@/lib/tenant-api-auth";

const ATTENDANCE_WRITE_ROLES = [
  TENANT_ROLE.PROVIDER_ADMIN,
  TENANT_ROLE.COORDINATOR,
  TENANT_ROLE.SUPERVISOR,
  TENANT_ROLE.TRAINER,
  TENANT_ROLE.FACILITATOR,
  TENANT_ROLE.SYSTEM_ADMIN,
] as const;

export async function GET(_: Request, { params }: { params: { orgSlug: string } }) {
  const actor = await resolveTenantApiActor({
    orgSlug: params.orgSlug,
    allowedRoles: TENANT_ROLE_GROUPS.EXPORT_READ,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const registers = await prisma.organizationDocument.findMany({
    where: {
      orgId: actor.actor.membership.organizationId,
      category: "ATTENDANCE_REGISTER",
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({
    ok: true,
    registers: registers.map((register) => ({
      ...register,
      metadata: parseAttendanceRegisterMetadata(register.notes),
    })),
  });
}

export async function POST(req: Request, { params }: { params: { orgSlug: string } }) {
  const actor = await resolveTenantApiActor({
    orgSlug: params.orgSlug,
    allowedRoles: ATTENDANCE_WRITE_ROLES,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const form = await req.formData();
  const file = form.get("file");
  const programmeIdRaw = String(form.get("programmeId") ?? "")
    .trim();
  const registerTypeRaw = String(form.get("registerType") ?? "MONTHLY_ATTENDANCE")
    .trim()
    .toUpperCase();
  const monthRaw = String(form.get("month") ?? "")
    .trim();
  const attendanceDateRaw = String(form.get("attendanceDate") ?? "")
    .trim();
  const learnerUserIdRaw = String(form.get("learnerUserId") ?? "")
    .trim();
  const trainerSignoffByRaw = String(form.get("trainerSignoffBy") ?? "")
    .trim();
  const notesRaw = String(form.get("notes") ?? "")
    .trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (!REGISTER_TYPES.includes(registerTypeRaw as (typeof REGISTER_TYPES)[number])) {
    return NextResponse.json({ error: "invalid registerType" }, { status: 400 });
  }

  if (monthRaw && !/^\d{4}-\d{2}$/.test(monthRaw)) {
    return NextResponse.json({ error: "month must be YYYY-MM" }, { status: 400 });
  }

  if (attendanceDateRaw && Number.isNaN(Date.parse(attendanceDateRaw))) {
    return NextResponse.json({ error: "invalid attendanceDate" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const programmeId = programmeIdRaw || "general";
  const key = `registers/${actor.actor.membership.organizationId}/${registerTypeRaw.toLowerCase()}/${monthRaw || "adhoc"}/${programmeId}/${Date.now()}-${file.name}`;
  await getStorageAdapter().put(key, bytes, file.type || "application/octet-stream");

  const metadata: AttendanceRegisterMetadata = {
    version: 1,
    registerType: registerTypeRaw as AttendanceRegisterMetadata["registerType"],
    programmeId: programmeIdRaw || null,
    month: monthRaw || null,
    attendanceDate: attendanceDateRaw || null,
    learnerUserId: learnerUserIdRaw || null,
    trainerSignoffBy:
      trainerSignoffByRaw ||
      actor.actor.user.name ||
      actor.actor.user.email ||
      null,
    trainerSignoffAt: new Date().toISOString(),
    coordinatorApprovalBy: null,
    coordinatorApprovalAt: null,
    coordinatorApprovalDecision: null,
    coordinatorApprovalNote: null,
    submittedByUserId: actor.actor.user.id,
    submittedByEmail: actor.actor.user.email,
    submittedAt: new Date().toISOString(),
    notes: notesRaw || null,
  };

  const register = await prisma.organizationDocument.create({
    data: {
      orgId: actor.actor.membership.organizationId,
      category: "ATTENDANCE_REGISTER",
      fileKey: key,
      notes: serializeAttendanceRegisterMetadata(metadata),
      status: "PENDING_REVIEW",
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: actor.actor.membership.organizationId,
      userId: actor.actor.user.id,
      action: "ATTENDANCE_REGISTER_SUBMITTED",
      entityType: "OrganizationDocument",
      entityId: register.id,
      metadata: {
        registerType: metadata.registerType,
        month: metadata.month,
        attendanceDate: metadata.attendanceDate,
        programmeId: metadata.programmeId,
        learnerUserId: metadata.learnerUserId,
      },
    },
  });

  const redirectUrl = new URL(`/org/${params.orgSlug}/app/registers`, req.url);
  redirectUrl.searchParams.set("notice", "register-submitted");
  return NextResponse.redirect(redirectUrl);
}
