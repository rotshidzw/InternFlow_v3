import { prisma } from "@internflow/db/src";
import { getStorageAdapter } from "@internflow/shared/src/storage";
import { NextResponse } from "next/server";
import {
  parseAttendanceRegisterMetadata,
  serializeAttendanceRegisterMetadata,
} from "@/lib/provider-operations";
import {
  TENANT_ROLE,
  TENANT_ROLE_GROUPS,
  resolveTenantApiActor,
  tenantApiAuthErrorResponse,
} from "@/lib/tenant-api-auth";

const ATTENDANCE_APPROVE_ROLES = [
  TENANT_ROLE.PROVIDER_ADMIN,
  TENANT_ROLE.COORDINATOR,
  TENANT_ROLE.SUPERVISOR,
  TENANT_ROLE.SYSTEM_ADMIN,
] as const;

export async function GET(_: Request, { params }: { params: { orgSlug: string; registerId: string } }) {
  const actor = await resolveTenantApiActor({
    orgSlug: params.orgSlug,
    allowedRoles: TENANT_ROLE_GROUPS.EXPORT_READ,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const register = await prisma.organizationDocument.findFirst({
    where: {
      id: params.registerId,
      orgId: actor.actor.membership.organizationId,
      category: "ATTENDANCE_REGISTER",
    },
  });
  if (!register) return NextResponse.json({ error: "Register not found" }, { status: 404 });

  const bytes = await getStorageAdapter().getBuffer(register.fileKey);
  const fileName = register.fileKey.split("/").pop() ?? "register";
  return new NextResponse(bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename=\"${fileName}\"`
    }
  });
}

export async function POST(
  req: Request,
  { params }: { params: { orgSlug: string; registerId: string } },
) {
  const actor = await resolveTenantApiActor({
    orgSlug: params.orgSlug,
    allowedRoles: ATTENDANCE_APPROVE_ROLES,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const register = await prisma.organizationDocument.findFirst({
    where: {
      id: params.registerId,
      orgId: actor.actor.membership.organizationId,
      category: "ATTENDANCE_REGISTER",
    },
  });
  if (!register) {
    return NextResponse.json({ ok: false, error: "Register not found" }, { status: 404 });
  }

  const form = await req.formData();
  const decision = String(form.get("decision") ?? "")
    .trim()
    .toUpperCase();
  const approvalNote = String(form.get("approvalNote") ?? "")
    .trim();

  if (decision !== "APPROVE" && decision !== "REJECT") {
    return NextResponse.json({ ok: false, error: "Invalid decision" }, { status: 400 });
  }

  const existingMeta = parseAttendanceRegisterMetadata(register.notes);
  const now = new Date().toISOString();
  const approvalDecision: "APPROVED" | "REJECTED" =
    decision === "APPROVE" ? "APPROVED" : "REJECTED";

  const updatedMeta = existingMeta
    ? {
        ...existingMeta,
        coordinatorApprovalBy: actor.actor.user.email,
        coordinatorApprovalAt: now,
        coordinatorApprovalDecision: approvalDecision,
        coordinatorApprovalNote: approvalNote || null,
      }
    : null;

  const nextStatus = decision === "APPROVE" ? "APPROVED" : "REJECTED";
  const updated = await prisma.organizationDocument.update({
    where: { id: register.id },
    data: {
      status: nextStatus,
      notes: updatedMeta ? serializeAttendanceRegisterMetadata(updatedMeta) : register.notes,
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: actor.actor.membership.organizationId,
      userId: actor.actor.user.id,
      action:
        decision === "APPROVE"
          ? "ATTENDANCE_REGISTER_APPROVED"
          : "ATTENDANCE_REGISTER_REJECTED",
      entityType: "OrganizationDocument",
      entityId: updated.id,
      metadata: { approvalNote: approvalNote || null },
    },
  });

  return NextResponse.redirect(new URL(req.headers.get("referer") ?? "/workspaces", req.url));
}
