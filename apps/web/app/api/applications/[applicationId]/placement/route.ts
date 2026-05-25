import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  TENANT_ROLE_GROUPS,
  resolveTenantApiActor,
  tenantApiAuthErrorResponse,
} from "@/lib/tenant-api-auth";

const schema = z.object({
  programId: z.string().trim().optional(),
  cohortId: z.string().trim().optional(),
});

export async function POST(req: Request, { params }: { params: { applicationId: string } }) {
  const payload = Object.fromEntries(await req.formData());
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid placement payload" }, { status: 400 });
  }

  const application = await prisma.application.findUnique({
    where: { id: params.applicationId },
    include: { opportunity: true },
  });
  if (!application) {
    return NextResponse.json({ ok: false, error: "Application not found" }, { status: 404 });
  }

  const actor = await resolveTenantApiActor({
    organizationId: application.opportunity.organizationId,
    allowedRoles: TENANT_ROLE_GROUPS.APP_REVIEW,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  if (application.status !== "ACCEPTED") {
    return NextResponse.json(
      { ok: false, error: "Placement can only be assigned after acceptance" },
      { status: 409 },
    );
  }

  const programId = parsed.data.programId || application.opportunity.programId || "";
  if (!programId) {
    return NextResponse.json(
      { ok: false, error: "Program is required before assigning placement" },
      { status: 400 },
    );
  }

  const program = await prisma.program.findFirst({
    where: { id: programId, organizationId: application.opportunity.organizationId },
    select: { id: true },
  });
  if (!program) {
    return NextResponse.json({ ok: false, error: "Program not found for this organization" }, { status: 404 });
  }

  const activeElsewhere = await prisma.enrollment.findFirst({
    where: {
      userId: application.userId,
      status: "ACTIVE",
      organizationId: { not: application.opportunity.organizationId },
    },
    select: { id: true },
  });
  if (activeElsewhere) {
    return NextResponse.json(
      { ok: false, error: "Learner has an active programme in another organization" },
      { status: 409 },
    );
  }

  const existingEnrollment = await prisma.enrollment.findFirst({
    where: {
      userId: application.userId,
      organizationId: application.opportunity.organizationId,
      status: { in: ["PENDING", "ACTIVE"] },
    },
    orderBy: { id: "desc" },
  });

  const enrollment = existingEnrollment
    ? await prisma.enrollment.update({
        where: { id: existingEnrollment.id },
        data: {
          programId: program.id,
          cohortId: parsed.data.cohortId || existingEnrollment.cohortId || null,
        },
      })
    : await prisma.enrollment.create({
        data: {
          organizationId: application.opportunity.organizationId,
          userId: application.userId,
          programId: program.id,
          cohortId: parsed.data.cohortId || null,
          status: "PENDING",
        },
      });

  await prisma.auditEvent.create({
    data: {
      tenantId: application.opportunity.organizationId,
      userId: actor.actor.user.id,
      action: "PLACEMENT_ASSIGNED",
      entityType: "Enrollment",
      entityId: enrollment.id,
      metadata: {
        applicationId: application.id,
        programId: enrollment.programId,
        cohortId: enrollment.cohortId,
        previousEnrollmentStatus: existingEnrollment?.status ?? null,
        nextEnrollmentStatus: enrollment.status,
      },
    },
  });

  const referer = req.headers.get("referer");
  if (referer) {
    return NextResponse.redirect(new URL(referer));
  }

  return NextResponse.json({ ok: true, enrollmentId: enrollment.id });
}

