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
        cohortName: string | null;
        status: string;
      };
    }
  | {
      type: "APPLICATION";
      application: {
        id: string;
        status: string;
        organizationId: string;
        organizationName: string;
        organizationSlug: string;
        opportunityTitle: string;
      };
    }
  | { type: "NONE" };

export async function resolveStudentTenantContext(userId: string): Promise<StudentTenantContext> {
  const activeEnrollment = await prisma.enrollment.findFirst({
    where: { userId, status: "ACTIVE" },
    include: {
      organization: true,
      program: true,
      cohort: true
    },
    orderBy: { id: "desc" }
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
        cohortName: activeEnrollment.cohort?.name ?? null,
        status: activeEnrollment.status
      }
    };
  }

  const latestApplication = await prisma.application.findFirst({
    where: { userId },
    include: {
      opportunity: {
        include: { organization: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  if (latestApplication?.opportunity?.organization) {
    return {
      type: "APPLICATION",
      application: {
        id: latestApplication.id,
        status: latestApplication.status,
        organizationId: latestApplication.opportunity.organizationId,
        organizationName: latestApplication.opportunity.organization.name,
        organizationSlug: latestApplication.opportunity.organization.slug,
        opportunityTitle: latestApplication.opportunity.title
      }
    };
  }

  return { type: "NONE" };
}
