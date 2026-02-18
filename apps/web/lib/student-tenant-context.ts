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

export async function resolveStudentTenantContext(userId: string): Promise<StudentTenantContext> {
  const activeEnrollment = await prisma.enrollment.findFirst({
    where: { userId, status: "ACTIVE" },
    include: { organization: true, program: true },
    orderBy: { createdAt: "desc" }
  });

  if (activeEnrollment) {
    return {
      type: "ENROLLED",
      enrollment: {
        id: activeEnrollment.id,
        organizationId: activeEnrollment.organizationId,
        organizationName: activeEnrollment.organization.name,
        organizationSlug: activeEnrollment.organization.slug,
        programName: activeEnrollment.program.name,
        status: activeEnrollment.status
      }
    };
  }

  const latestApplication = await prisma.application.findFirst({
    where: { userId },
    include: { opportunity: { include: { organization: true } } },
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }]
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
        status: latestApplication.status
      }
    };
  }

  return { type: "NONE" };
}
