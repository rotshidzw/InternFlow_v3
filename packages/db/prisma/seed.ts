import { PrismaClient, Role, OrganizationStatus, OrganizationType, OpportunityStatus, OpportunityType, ApplicationStatus, EnrollmentStatus } from "@prisma/client";

const prisma = new PrismaClient();

const firstNames = ["Sam", "Nandi", "Lebo", "Anele", "Sizwe", "Mia", "Tumi", "Palesa", "Neo", "Zola", "Amahle", "Thando", "Karabo", "Rethabile", "Sipho", "Ayanda", "Kea", "Naledi", "Aphiwe", "Bonga"];

function slugify(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

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
  await prisma.ticketEvent.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatThread.deleteMany();
  await prisma.logbookApproval.deleteMany();
  await prisma.logbookEntry.deleteMany();
  await prisma.documentVersion.deleteMany();
  await prisma.document.deleteMany();
  await prisma.checklistItemInstance.deleteMany();
  await prisma.checklistInstance.deleteMany();
  await prisma.application.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.cohort.deleteMany();
  await prisma.program.deleteMany();
  await prisma.organizationDocument.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.organization.deleteMany();
  const admin = await upsertUser("admin@internflow.com", Role.SYSTEM_ADMIN, "InternFlow HQ Admin");
  const providerAdmin = await upsertUser("provider@demo.com", Role.PROVIDER_ADMIN, "Priya Provider");
  const coordinator = await upsertUser("coordinator@demo.com", Role.COORDINATOR, "Casey Coordinator");
  const supervisor = await upsertUser("supervisor@demo.com", Role.SUPERVISOR, "Sydney Supervisor");
  const demoStudent = await upsertUser("student@demo.com", Role.STUDENT, "Sam Student");

  const orgDefs = [
    { name: "Raftech", slug: "raftech", type: OrganizationType.COMPANY, province: "Gauteng" },
    { name: "Demo Training Provider", slug: "demo-training-provider", type: OrganizationType.TRAINING_PROVIDER, province: "Western Cape" },
    { name: "FutureSkills NGO", slug: "futureskills-ngo", type: OrganizationType.NGO, province: "KwaZulu-Natal" }
  ];

  const organizations = [] as Awaited<ReturnType<typeof prisma.organization.upsert>>[];
  for (const def of orgDefs) {
    const org = await prisma.organization.upsert({
      where: { slug: def.slug },
      update: { status: OrganizationStatus.APPROVED },
      create: {
        name: def.name,
        slug: def.slug,
        type: def.type,
        status: OrganizationStatus.APPROVED,
        country: "South Africa",
        province: def.province,
        contactPerson: `${def.name} Contact`,
        createdBy: admin.id
      }
    });
    organizations.push(org);
  }

  await Promise.all([
    addMembership(admin.id, organizations[0].id, Role.SYSTEM_ADMIN),
    addMembership(providerAdmin.id, organizations[0].id, Role.PROVIDER_ADMIN),
    addMembership(coordinator.id, organizations[0].id, Role.COORDINATOR),
    addMembership(supervisor.id, organizations[0].id, Role.SUPERVISOR),
    addMembership(demoStudent.id, organizations[0].id, Role.STUDENT)
  ]);

  const students = [] as Awaited<ReturnType<typeof prisma.user.upsert>>[];
  for (let i = 0; i < 20; i++) {
    const email = `student${i + 1}@demo.com`;
    const user = await upsertUser(email, Role.STUDENT, `${firstNames[i]} Learner`);
    students.push(user);
    await addMembership(user.id, organizations[i % organizations.length].id, Role.STUDENT);
  }

  const programs = [] as Awaited<ReturnType<typeof prisma.program.create>>[];
  for (const org of organizations) {
    const program = await prisma.program.create({
      data: {
        organizationId: org.id,
        name: `${org.name} Digital Program`,
        description: `End-to-end internship program for ${org.name}`,
        rulesJson: { payslipsRequired: true, weeklyLogbook: true },
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
      }
    });
    programs.push(program);

    await prisma.cohort.create({
      data: {
        organizationId: org.id,
        programId: program.id,
        name: `${org.name} Cohort 2026`,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 12))
      }
    });
  }

  const opportunities = [] as Awaited<ReturnType<typeof prisma.opportunity.create>>[];
  for (let i = 0; i < 10; i++) {
    const org = organizations[i % organizations.length];
    const program = programs[i % programs.length];
    opportunities.push(await prisma.opportunity.create({
      data: {
        organizationId: org.id,
        programId: program.id,
        type: i % 2 === 0 ? OpportunityType.INTERNSHIP : OpportunityType.LEARNERSHIP,
        title: `${org.name} Opportunity ${i + 1}`,
        slug: `opportunity-${i + 1}`,
        description: `Hands-on placement ${i + 1} at ${org.name}`,
        requirementsJson: { docs: ["ID", "CV", "AFFIDAVIT"] },
        capacity: 30,
        status: OpportunityStatus.PUBLISHED
      }
    }));
  }

  for (let i = 0; i < 40; i++) {
    const student = students[i % students.length];
    const opportunity = opportunities[i % opportunities.length];
    const statusCycle = [ApplicationStatus.APPLIED, ApplicationStatus.SHORTLISTED, ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED];
    const status = statusCycle[i % statusCycle.length];

    const app = await prisma.application.create({
      data: {
        userId: student.id,
        opportunityId: opportunity.id,
        status,
        submittedAt: new Date(),
        notes: status === ApplicationStatus.REJECTED ? "Not selected for this cycle" : "Active"
      }
    });

    const checklist = await prisma.checklistInstance.create({
      data: {
        applicationId: app.id,
        progress: 0,
        items: {
          createMany: {
            data: [
              { label: "Upload ID", status: i % 2 === 0 ? "DONE" : "PENDING", actionType: "upload" },
              { label: "Sign policy", status: i % 3 === 0 ? "DONE" : "PENDING", actionType: "sign" },
              { label: "Submit bank form", status: i % 4 === 0 ? "DONE" : "PENDING", actionType: "fill" }
            ]
          }
        }
      },
      include: { items: true }
    });

    const done = checklist.items.filter((item) => item.status === "DONE").length;
    await prisma.checklistInstance.update({ where: { id: checklist.id }, data: { progress: Math.round((done / checklist.items.length) * 100) } });
  }

  for (const student of students.slice(0, 12)) {
    const membership = await prisma.membership.findFirstOrThrow({ where: { userId: student.id }, include: { organization: true } });
    const program = programs.find((p) => p.organizationId === membership.organizationId) ?? programs[0];
    const cohort = await prisma.cohort.findFirstOrThrow({ where: { organizationId: membership.organizationId } });

    await prisma.enrollment.create({
      data: {
        organizationId: membership.organizationId,
        userId: student.id,
        programId: program.id,
        cohortId: cohort.id,
        status: EnrollmentStatus.ACTIVE,
        stipendPaid: Math.random() > 0.4,
        stipendMonth: "2026-02"
      }
    });

    await prisma.document.create({
      data: {
        userId: student.id,
        organizationId: membership.organizationId,
        type: "AFFIDAVIT",
        status: "SCAN_OK",
        expirationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        versions: { create: { storageKey: `seed/docs/${student.id}/affidavit.pdf`, mimeType: "application/pdf", sizeBytes: 20480 } }
      }
    });

    await prisma.document.create({
      data: {
        userId: student.id,
        organizationId: membership.organizationId,
        type: "PAYSLIP",
        status: "SUBMITTED",
        versions: { create: { storageKey: `seed/docs/${student.id}/payslip.pdf`, mimeType: "application/pdf", sizeBytes: 15360 } }
      }
    });

    const entry = await prisma.logbookEntry.create({
      data: { userId: student.id, weekStart: new Date(), summary: "Completed onboarding activities and workplace tasks", evidenceKey: `seed/evidence/${student.id}.pdf` }
    });

    await prisma.logbookApproval.create({
      data: { entryId: entry.id, reviewerId: supervisor.id, status: Math.random() > 0.2 ? "APPROVED" : "REJECTED", comment: "Reviewed by supervisor" }
    });

    const thread = await prisma.chatThread.create({ data: { userId: student.id, title: `WhatsApp Sim ${student.email}` } });
    await prisma.chatMessage.createMany({
      data: [
        { threadId: thread.id, role: "USER", body: "1" },
        { threadId: thread.id, role: "SYSTEM", body: "Status: onboarding in progress." }
      ]
    });

    const ticket = await prisma.ticket.create({ data: { userId: student.id, title: "Demo support ticket", summary: "Generated from WhatsApp simulator" } });
    await prisma.ticketEvent.create({ data: { ticketId: ticket.id, event: "Created from WhatsApp flow" } });
  }

  await prisma.auditLog.createMany({
    data: [
      { userId: demoStudent.id, action: "LOGIN_OTP_REQUESTED" },
      { userId: demoStudent.id, action: "LOGIN_OTP_VERIFIED" },
      { userId: admin.id, action: "ORG_APPROVED", metadata: { org: organizations[0].slug } }
    ]
  });
}

main().finally(async () => prisma.$disconnect());
