import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  TENANT_ROLE_GROUPS,
  resolveTenantApiActor,
  tenantApiAuthErrorResponse,
} from "@/lib/tenant-api-auth";

const schema = z.object({
  status: z.enum(["PENDING", "ACTIVE", "COMPLETED", "CANCELLED"]),
});

const TRANSITIONS: Record<string, string[]> = {
  PENDING: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: ["PENDING"],
};

function canTransition(current: string, next: string) {
  if (current === next) return true;
  return (TRANSITIONS[current] ?? []).includes(next);
}

export async function POST(req: Request, { params }: { params: { enrollmentId: string } }) {
  const payload = Object.fromEntries(await req.formData());
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid enrollment status payload" }, { status: 400 });
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: params.enrollmentId },
  });
  if (!enrollment) {
    return NextResponse.json({ ok: false, error: "Enrollment not found" }, { status: 404 });
  }

  const actor = await resolveTenantApiActor({
    organizationId: enrollment.organizationId,
    allowedRoles: TENANT_ROLE_GROUPS.APP_REVIEW,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const currentStatus = enrollment.status.toUpperCase();
  const nextStatus = parsed.data.status.toUpperCase();
  if (!canTransition(currentStatus, nextStatus)) {
    return NextResponse.json(
      { ok: false, error: `Invalid transition from ${currentStatus} to ${nextStatus}` },
      { status: 409 },
    );
  }

  const updated = await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: { status: parsed.data.status },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: enrollment.organizationId,
      userId: actor.actor.user.id,
      action: "ENROLLMENT_STATUS_UPDATED",
      entityType: "Enrollment",
      entityId: enrollment.id,
      metadata: {
        previousStatus: currentStatus,
        nextStatus,
      },
    },
  });

  const referer = req.headers.get("referer");
  if (referer) {
    return NextResponse.redirect(new URL(referer));
  }

  return NextResponse.json({ ok: true, enrollment: updated });
}

