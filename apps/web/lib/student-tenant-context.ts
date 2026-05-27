import { prisma } from "@internflow/db/src";

export type StudentTenantContext =
  | {
      type: "ENROLLED";
      enrollment: {
        id: string;
        organizationId: string;
        organizationName: string;
        organizationSlug: string;
        programName: string;
        status: string;
      };
    }
  | {
      type: "APPLICATION";
      application: {
        id: string;
        organizationId: string;
        organizationName: string;
        organizationSlug: string;
        opportunityTitle: string;
        status: string;
      };
    }
  | { type: "NONE" };

export async function resolveStudentTenantContext(
  userId: string,
): Promise<StudentTenantContext> {
  const activeEnrollment = await prisma.enrollment.findFirst({
    where: { userId, status: "ACTIVE" },
    include: { organization: true, program: true },
    orderBy: { id: "desc" },
  });

  const pendingEnrollment = activeEnrollment
    ? null
    : await prisma.enrollment.findFirst({
        where: { userId, status: "PENDING" },
        include: { organization: true, program: true },
        orderBy: { id: "desc" },
      });

  const enrollment = activeEnrollment ?? pendingEnrollment;

  if (enrollment) {
    return {
      type: "ENROLLED",
      enrollment: {
        id: enrollment.id,
        organizationId: enrollment.organizationId,
        organizationName: enrollment.organization.name,
        organizationSlug: enrollment.organization.slug,
        programName: enrollment.program.name,
        status: enrollment.status,
      },
    };
  }

  const latestApplication = await prisma.application.findFirst({
    where: { userId },
    include: { opportunity: { include: { organization: true } } },
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
  });

  if (latestApplication) {
    return {
      type: "APPLICATION",
      application: {
        id: latestApplication.id,
        organizationId: latestApplication.opportunity.organizationId,
        organizationName: latestApplication.opportunity.organization.name,
        organizationSlug: latestApplication.opportunity.organization.slug,
        opportunityTitle: latestApplication.opportunity.title,
        status: latestApplication.status,
      },
    };
  }

  const completedEnrollment = await prisma.enrollment.findFirst({
    where: { userId, status: "COMPLETED" },
    include: { organization: true, program: true },
    orderBy: { id: "desc" },
  });

  if (completedEnrollment) {
    return {
      type: "ENROLLED",
      enrollment: {
        id: completedEnrollment.id,
        organizationId: completedEnrollment.organizationId,
        organizationName: completedEnrollment.organization.name,
        organizationSlug: completedEnrollment.organization.slug,
        programName: completedEnrollment.program.name,
        status: completedEnrollment.status,
      },
    };
  }

  return { type: "NONE" };
}
