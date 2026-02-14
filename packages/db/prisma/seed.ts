import { PrismaClient, Role, OrganizationStatus, OrganizationType, OpportunityStatus, OpportunityType, ApplicationStatus, EnrollmentStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function upsertUser(email: string, role: Role, name: string) {
  return prisma.user.upsert({ where: { email }, update: { role, name }, create: { email, role, name } });
}

async function addMembership(userId: string, organizationId: string, role: Role) {
  return prisma.membership.upsert({
    where: { userId_organizationId: { userId, organizationId } },
    update: { role },
    create: { userId, organizationId, role }
  });
}

async function main() {
  const systemAdmin = await upsertUser("admin@internflow.com", Role.SYSTEM_ADMIN, "InternFlow Admin");

  const raftech = await prisma.organization.upsert({
    where: { slug: "raftech" },
    update: { status: OrganizationStatus.APPROVED },
    create: {
      name: "Raftech",
      slug: "raftech",
      type: OrganizationType.COMPANY,
      status: OrganizationStatus.APPROVED,
      country: "South Africa",
      province: "Gauteng",
      contactPerson: "Raftech Operations",
      createdBy: systemAdmin.id
    }
  });

  const trainingProvider = await prisma.organization.upsert({
    where: { slug: "demo-training-provider" },
    update: { status: OrganizationStatus.APPROVED },
    create: {
      name: "Demo Training Provider",
      slug: "demo-training-provider",
      type: OrganizationType.TRAINING_PROVIDER,
      status: OrganizationStatus.APPROVED,
      country: "South Africa",
      province: "Western Cape",
      contactPerson: "Provider Admin",
      createdBy: systemAdmin.id
    }
  });

  const providerAdmin = await upsertUser("provider@demo.com", Role.PROVIDER_ADMIN, "Priya Provider");
  const coordinator = await upsertUser("coordinator@demo.com", Role.COORDINATOR, "Casey Coordinator");
  const supervisor = await upsertUser("supervisor@demo.com", Role.SUPERVISOR, "Sydney Supervisor");
  const student = await upsertUser("student@demo.com", Role.STUDENT, "Sam Student");
  const studentTwo = await upsertUser("student2@demo.com", Role.STUDENT, "Nandi Student");

  await Promise.all([
    addMembership(systemAdmin.id, raftech.id, Role.SYSTEM_ADMIN),
    addMembership(providerAdmin.id, raftech.id, Role.PROVIDER_ADMIN),
    addMembership(coordinator.id, raftech.id, Role.COORDINATOR),
    addMembership(supervisor.id, raftech.id, Role.SUPERVISOR),
    addMembership(student.id, raftech.id, Role.STUDENT),
    addMembership(studentTwo.id, trainingProvider.id, Role.STUDENT),
    addMembership(providerAdmin.id, trainingProvider.id, Role.PROVIDER_ADMIN)
  ]);

  const program = await prisma.program.upsert({
    where: { id: "raftech-program-seed" },
    update: {},
    create: {
      id: "raftech-program-seed",
      organizationId: raftech.id,
      name: "Raftech Digital Skills",
      description: "Workplace integrated digital program",
      rulesJson: { requiresPayslip: true, monthlyLogbook: true },
      startDate: new Date(),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
    }
  });

  const cohort = await prisma.cohort.upsert({
    where: { id: "raftech-cohort-2026" },
    update: {},
    create: {
      id: "raftech-cohort-2026",
      organizationId: raftech.id,
      programId: program.id,
      name: "Cohort 2026",
      startDate: new Date(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 12))
    }
  });

  const opportunity = await prisma.opportunity.upsert({
    where: { id: "raftech-opportunity-1" },
    update: {},
    create: {
      id: "raftech-opportunity-1",
      organizationId: raftech.id,
      programId: program.id,
      type: OpportunityType.INTERNSHIP,
      title: "Junior Product Operations Intern",
      description: "Support program operations and learner onboarding.",
      requirementsJson: { docs: ["ID", "CV", "PROOF_OF_ADDRESS"] },
      capacity: 100,
      status: OpportunityStatus.PUBLISHED
    }
  });

  await prisma.application.upsert({
    where: { id: "raftech-application-1" },
    update: {},
    create: {
      id: "raftech-application-1",
      userId: student.id,
      opportunityId: opportunity.id,
      status: ApplicationStatus.ACCEPTED,
      submittedAt: new Date(),
      notes: "Accepted into Cohort 2026"
    }
  });

  await prisma.application.upsert({
    where: { id: "raftech-application-2" },
    update: {},
    create: {
      id: "raftech-application-2",
      userId: studentTwo.id,
      opportunityId: opportunity.id,
      status: ApplicationStatus.REJECTED,
      submittedAt: new Date(),
      notes: "Not shortlisted for current intake"
    }
  });

  await prisma.enrollment.upsert({
    where: { id: "raftech-enrollment-1" },
    update: {},
    create: {
      id: "raftech-enrollment-1",
      organizationId: raftech.id,
      userId: student.id,
      programId: program.id,
      cohortId: cohort.id,
      status: EnrollmentStatus.ACTIVE,
      stipendPaid: true
    }
  });

  await prisma.auditLog.createMany({
    data: [
      { userId: student.id, action: "LOGIN_OTP_REQUESTED" },
      { userId: student.id, action: "LOGIN_OTP_VERIFIED" }
    ]
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
