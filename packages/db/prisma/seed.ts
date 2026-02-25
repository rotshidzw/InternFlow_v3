import {
  PrismaClient,
  Role,
  OrganizationStatus,
  OrganizationType,
  OpportunityStatus,
  OpportunityType,
  ApplicationStatus,
  EnrollmentStatus,
  PlatformRole,
  VerificationStatus,
  TicketPriority,
  TicketCategory,
  TicketStatus,
  MeetingStatus,
  AuditScope
} from "@prisma/client";

const prisma = new PrismaClient();

const firstNames = ["Sam", "Nandi", "Lebo", "Anele", "Sizwe", "Mia", "Tumi", "Palesa", "Neo", "Zola", "Amahle", "Thando", "Karabo", "Rethabile", "Sipho", "Ayanda", "Kea", "Naledi", "Aphiwe", "Bonga"];

async function upsertUser(email: string, role: Role, name: string) {
  return prisma.user.upsert({ where: { email }, update: { role, name }, create: { email, role, name } });
}

async function addTenantMembership(userId: string, organizationId: string, role: Role) {
  return prisma.membership.upsert({
    where: { userId_organizationId: { userId, organizationId } },
    update: { role },
    create: { userId, organizationId, role }
  });
}

async function addPlatformMembership(userId: string, role: PlatformRole) {
  return prisma.platformMembership.upsert({
    where: { userId_role: { userId, role } },
    update: {},
    create: { userId, role }
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
  await prisma.organizationVerification.deleteMany();
  await prisma.organizationDocument.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.usageMetricsDaily.deleteMany();
  await prisma.platformMembership.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.programmeExportJob.deleteMany();
  await prisma.exportTemplate.deleteMany();
  await prisma.organization.deleteMany();

  const platformAdmin = await upsertUser("admin@internflow.com", Role.SYSTEM_ADMIN, "InternFlow HQ Admin");
  const platformSales = await upsertUser("sales@internflow.com", Role.SYSTEM_ADMIN, "Sales Lead");
  const platformSupport = await upsertUser("support@internflow.com", Role.SYSTEM_ADMIN, "Support Lead");
  const platformOps = await upsertUser("ops@internflow.com", Role.SYSTEM_ADMIN, "Operations Lead");
  const platformFinance = await upsertUser("finance@internflow.com", Role.SYSTEM_ADMIN, "Finance Lead");

  await Promise.all([
    addPlatformMembership(platformAdmin.id, PlatformRole.PLATFORM_ADMIN),
    addPlatformMembership(platformSales.id, PlatformRole.PLATFORM_SALES),
    addPlatformMembership(platformSupport.id, PlatformRole.PLATFORM_SUPPORT),
    addPlatformMembership(platformOps.id, PlatformRole.PLATFORM_OPS),
    addPlatformMembership(platformFinance.id, PlatformRole.PLATFORM_FINANCE)
  ]);

  const tenantDefs = [
    { name: "Raftech", slug: "raftech", status: OrganizationStatus.APPROVED, type: OrganizationType.COMPANY },
    { name: "Demo Training Provider", slug: "demo-training-provider", status: OrganizationStatus.APPROVED, type: OrganizationType.TRAINING_PROVIDER },
    { name: "FutureSkills NGO", slug: "futureskills-ngo", status: OrganizationStatus.PENDING_REVIEW, type: OrganizationType.NGO },
    { name: "SkillUp University", slug: "skillup-university", status: OrganizationStatus.REJECTED, type: OrganizationType.UNIVERSITY },
    { name: "Gov Youth Program", slug: "gov-youth-program", status: OrganizationStatus.PENDING_REVIEW, type: OrganizationType.GOVERNMENT_PROGRAM }
  ];

  const tenants = [] as Awaited<ReturnType<typeof prisma.organization.create>>[];
  for (const def of tenantDefs) {
    tenants.push(await prisma.organization.create({
      data: {
        name: def.name,
        slug: def.slug,
        type: def.type,
        status: def.status,
        country: "South Africa",
        province: "Gauteng",
        contactPerson: `${def.name} Contact`,
        rejectionReason: def.status === OrganizationStatus.REJECTED ? "Compliance docs incomplete" : null,
        createdBy: platformAdmin.id
      }
    }));
  }

  for (const tenant of tenants) {
    await prisma.organizationVerification.create({
      data: {
        orgId: tenant.id,
        submittedBy: platformAdmin.id,
        status: tenant.status === OrganizationStatus.APPROVED ? VerificationStatus.APPROVED : tenant.status === OrganizationStatus.REJECTED ? VerificationStatus.REJECTED : VerificationStatus.PENDING,
        reason: tenant.status === OrganizationStatus.REJECTED ? "Missing tax clearance" : null,
        docsJson: {
          CIPC: "uploaded",
          taxClearance: tenant.status === OrganizationStatus.REJECTED ? "missing" : "uploaded",
          BBBEE: "uploaded",
          proofOfAddress: "uploaded"
        }
      }
    });
  }

  const providerAdmin = await upsertUser("provider@demo.com", Role.PROVIDER_ADMIN, "Priya Provider");
  const coordinator = await upsertUser("coordinator@demo.com", Role.COORDINATOR, "Casey Coordinator");
  const supervisor = await upsertUser("supervisor@demo.com", Role.SUPERVISOR, "Sydney Supervisor");
  const demoStudent = await upsertUser("student@demo.com", Role.STUDENT, "Sam Student");

  await Promise.all([
    addTenantMembership(providerAdmin.id, tenants[0].id, Role.PROVIDER_ADMIN),
    addTenantMembership(coordinator.id, tenants[0].id, Role.COORDINATOR),
    addTenantMembership(supervisor.id, tenants[0].id, Role.SUPERVISOR),
    addTenantMembership(demoStudent.id, tenants[0].id, Role.STUDENT)
  ]);

  const students = [] as Awaited<ReturnType<typeof prisma.user.create>>[];
  for (let i = 0; i < 20; i++) {
    const user = await upsertUser(`student${i + 1}@demo.com`, Role.STUDENT, `${firstNames[i]} Learner`);
    students.push(user);
    const tenant = tenants[i % tenants.length];
    await addTenantMembership(user.id, tenant.id, Role.STUDENT);
  }


  for (const tenant of tenants) {
    await prisma.exportTemplate.createMany({
      data: [
        {
          tenantId: tenant.id,
          name: "SITA Close-Out",
          description: "SITA-aligned close-out folder and evidence configuration",
          structureJson: {
            docFolders: ["01_ID", "02_Attendance_Register", "03_Beneficiary_Forms", "04_Qualifications", "05_Logbooks", "06_Images", "07_Reports"]
          },
          includeRulesJson: {
            attendance: true,
            learnerRegister: true,
            beneficiaries: true,
            documents: true,
            logbooks: true,
            payslips: false,
            images: true
          }
        },
        {
          tenantId: tenant.id,
          name: "Training Event Pack",
          description: "Compact export profile for short-form training interventions",
          structureJson: {
            docFolders: ["01_ID", "02_Attendance_Register", "03_Beneficiary_Forms", "04_Qualifications", "05_Logbooks", "06_Images", "07_Reports"]
          },
          includeRulesJson: {
            attendance: true,
            learnerRegister: true,
            beneficiaries: false,
            documents: true,
            logbooks: false,
            payslips: false,
            images: false
          }
        }
      ]
    });
  }

  const programs = [] as Awaited<ReturnType<typeof prisma.program.create>>[];
  for (const tenant of tenants) {
    const program = await prisma.program.create({
      data: {
        organizationId: tenant.id,
        name: `${tenant.name} Skills Program`,
        description: `Program for ${tenant.name}`,
        rulesJson: { monthlyPayslip: true, weeklyLogbook: true },
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
      }
    });
    programs.push(program);

    await prisma.cohort.create({
      data: {
        organizationId: tenant.id,
        programId: program.id,
        name: `${tenant.name} Cohort 2026`,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 10))
      }
    });
  }

  const opportunities = [] as Awaited<ReturnType<typeof prisma.opportunity.create>>[];
  for (let i = 0; i < 10; i++) {
    const tenant = tenants[i % tenants.length];
    const program = programs.find((p) => p.organizationId === tenant.id)!;
    opportunities.push(await prisma.opportunity.create({
      data: {
        organizationId: tenant.id,
        programId: program.id,
        type: i % 2 === 0 ? OpportunityType.INTERNSHIP : OpportunityType.LEARNERSHIP,
        title: `${tenant.name} Opportunity ${i + 1}`,
        slug: `opportunity-${i + 1}`,
        description: `Placement ${i + 1} for ${tenant.name}`,
        requirementsJson: { docs: ["ID", "CV", "AFFIDAVIT"] },
        capacity: 20,
        status: OpportunityStatus.PUBLISHED
      }
    }));
  }

  for (let i = 0; i < 40; i++) {
    const student = students[i % students.length];
    const opp = opportunities[i % opportunities.length];
    const statusCycle = [ApplicationStatus.APPLIED, ApplicationStatus.SHORTLISTED, ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED];
    const status = statusCycle[i % statusCycle.length];

    const application = await prisma.application.create({
      data: {
        userId: student.id,
        opportunityId: opp.id,
        status,
        submittedAt: new Date(),
        notes: status === ApplicationStatus.REJECTED ? "Pipeline rejected" : "In pipeline"
      }
    });

    const checklist = await prisma.checklistInstance.create({
      data: {
        applicationId: application.id,
        progress: 0,
        items: {
          createMany: {
            data: [
              { label: "Upload ID", status: i % 2 ? "PENDING" : "DONE", actionType: "upload" },
              { label: "Sign Code of Conduct", status: i % 3 ? "PENDING" : "DONE", actionType: "sign" },
              { label: "Submit onboarding form", status: i % 4 ? "PENDING" : "DONE", actionType: "fill" }
            ]
          }
        }
      },
      include: { items: true }
    });

    const done = checklist.items.filter((x) => x.status === "DONE").length;
    await prisma.checklistInstance.update({ where: { id: checklist.id }, data: { progress: Math.round((done / checklist.items.length) * 100) } });
  }

  for (const student of students.slice(0, 12)) {
    const membership = await prisma.membership.findFirstOrThrow({ where: { userId: student.id }, include: { organization: true } });
    const program = programs.find((p) => p.organizationId === membership.organizationId)!;
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
        versions: { create: { storageKey: `seed/docs/${student.id}/affidavit.pdf`, mimeType: "application/pdf", sizeBytes: 10240 } }
      }
    });

    await prisma.logbookEntry.create({
      data: {
        userId: student.id,
        weekStart: new Date(),
        summary: "Worked on team tasks, API debugging, and compliance submissions",
        evidenceKey: `seed/logbook/${student.id}.pdf`
      }
    });

    const thread = await prisma.chatThread.create({ data: { userId: student.id, title: `WhatsApp Sim ${student.email}` } });
    await prisma.chatMessage.createMany({ data: [{ threadId: thread.id, role: "USER", body: "status" }, { threadId: thread.id, role: "SYSTEM", body: "Status shared." }] });

    const ticket = await prisma.ticket.create({
      data: {
        userId: student.id,
        orgId: membership.organizationId,
        createdByUserId: student.id,
        title: "Demo support ticket",
        summary: "Created from seeded demo",
        status: TicketStatus.OPEN,
        priority: TicketPriority.MEDIUM,
        category: TicketCategory.TECHNICAL
      }
    });
    await prisma.ticketEvent.create({ data: { ticketId: ticket.id, type: "CREATED", event: "Ticket seeded", payload: { source: "seed" } } });
  }


  // Tenant body demo pack: staff + programs + opportunities + applicants + enrollments per tenant
  for (let tIndex = 0; tIndex < tenants.length; tIndex++) {
    const tenant = tenants[tIndex];
    const domain = `tenant${tIndex + 1}.co.za`;

    const tenantAdmin = await upsertUser(`tenant-admin@${domain}`, Role.PROVIDER_ADMIN, `${tenant.name} Admin`);
    const tenantCoordinator = await upsertUser(`coordinator@${domain}`, Role.COORDINATOR, `${tenant.name} Coordinator`);
    const tenantSupervisor = await upsertUser(`supervisor@${domain}`, Role.SUPERVISOR, `${tenant.name} Supervisor`);
    const tenantStudentA = await upsertUser(`student-a@${domain}`, Role.STUDENT, `${tenant.name} Student A`);
    const tenantStudentB = await upsertUser(`student-b@${domain}`, Role.STUDENT, `${tenant.name} Student B`);

    await Promise.all([
      addTenantMembership(tenantAdmin.id, tenant.id, Role.PROVIDER_ADMIN),
      addTenantMembership(tenantCoordinator.id, tenant.id, Role.COORDINATOR),
      addTenantMembership(tenantSupervisor.id, tenant.id, Role.SUPERVISOR),
      addTenantMembership(tenantStudentA.id, tenant.id, Role.STUDENT),
      addTenantMembership(tenantStudentB.id, tenant.id, Role.STUDENT)
    ]);

    const secondProgram = await prisma.program.create({
      data: {
        organizationId: tenant.id,
        name: `${tenant.name} CETA Apprenticeship`,
        description: `CETA aligned path for ${tenant.name}`,
        rulesJson: { setaCetaName: tIndex % 2 === 0 ? "CETA" : "SETA", requiresSignature: true },
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
      }
    });

    const orgPrograms = await prisma.program.findMany({ where: { organizationId: tenant.id } });

    for (let j = 0; j < 8; j++) {
      const program = orgPrograms[j % orgPrograms.length] ?? secondProgram;
      await prisma.opportunity.create({
        data: {
          organizationId: tenant.id,
          programId: program.id,
          type: j % 2 === 0 ? OpportunityType.INTERNSHIP : OpportunityType.SKILLS_PROGRAM,
          title: `${tenant.name} Body Opportunity ${j + 1}`,
          slug: `${tenant.slug}-body-opportunity-${j + 1}-${Date.now()}-${j}`,
          description: `Body portal opportunity ${j + 1}`,
          requirementsJson: { docs: ["ID", "CV", "CERTIFICATE"], eligibility: ["South African resident"] },
          capacity: 30,
          status: OpportunityStatus.PUBLISHED
        }
      });
    }

    const orgOpps = await prisma.opportunity.findMany({ where: { organizationId: tenant.id } });
    const applicantUsers: { id: string }[] = [];
    for (let a = 0; a < 30; a++) {
      const applicant = await upsertUser(`applicant${a + 1}@${domain}`, Role.STUDENT, `${tenant.name} Applicant ${a + 1}`);
      applicantUsers.push(applicant);
      await addTenantMembership(applicant.id, tenant.id, Role.STUDENT);

      const opp = orgOpps[a % orgOpps.length];
      const statusCycle = [ApplicationStatus.APPLIED, ApplicationStatus.SHORTLISTED, ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED];
      const appStatus = statusCycle[a % statusCycle.length];
      const application = await prisma.application.create({
        data: {
          userId: applicant.id,
          opportunityId: opp.id,
          status: appStatus,
          submittedAt: new Date(),
          notes: appStatus === ApplicationStatus.REJECTED ? "Eligibility mismatch" : "In pipeline"
        }
      });

      await prisma.checklistInstance.create({
        data: {
          applicationId: application.id,
          progress: appStatus === ApplicationStatus.ACCEPTED ? 40 : 0,
          items: { createMany: { data: [
            { label: "Certified ID", status: "PENDING", actionType: "upload" },
            { label: "Signed code of conduct", status: "PENDING", actionType: "sign" }
          ] } }
        }
      });
    }

    for (const learner of applicantUsers.slice(0, 20)) {
      const program = orgPrograms[Math.floor(Math.random() * orgPrograms.length)] ?? secondProgram;
      await prisma.enrollment.create({
        data: {
          organizationId: tenant.id,
          userId: learner.id,
          programId: program.id,
          status: EnrollmentStatus.ACTIVE,
          stipendPaid: Math.random() > 0.5,
          stipendMonth: "2026-02"
        }
      });

      await prisma.document.create({
        data: {
          userId: learner.id,
          organizationId: tenant.id,
          type: "CERTIFICATE",
          status: "SCAN_OK",
          selfCertifiedAt: new Date(),
          expirationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          versions: { create: { storageKey: `seed/docs/${tenant.slug}/${learner.id}.pdf`, mimeType: "application/pdf", sizeBytes: 21000 } }
        }
      });

      const entry = await prisma.logbookEntry.create({
        data: {
          userId: learner.id,
          weekStart: new Date(),
          summary: "Completed weekly workplace learning objectives",
          evidenceKey: `seed/logbook/${tenant.slug}/${learner.id}.pdf`
        }
      });
      await prisma.logbookApproval.create({ data: { entryId: entry.id, reviewerId: tenantSupervisor.id, status: "APPROVED", comment: "Good progress" } });
    }
  }

  for (let i = 0; i < 10; i++) {
    const tenant = tenants[i % tenants.length];
    await prisma.meeting.create({
      data: {
        title: `Onboarding sync ${i + 1}`,
        orgId: tenant.id,
        startAt: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        endAt: new Date(Date.now() + (i * 24 * 60 * 60 * 1000) + 45 * 60 * 1000),
        meetingUrl: `https://meet.local/${tenant.slug}/${i + 1}`,
        notes: "Discuss adoption and support items",
        agenda: "Product onboarding, compliance, Q&A",
        status: MeetingStatus.SCHEDULED,
        createdBy: platformSales.id
      }
    });
  }

  for (const tenant of tenants) {
    for (let day = 0; day < 14; day++) {
      const date = new Date(Date.now() - day * 24 * 60 * 60 * 1000);
      date.setHours(0, 0, 0, 0);
      await prisma.usageMetricsDaily.create({
        data: {
          orgId: tenant.id,
          date,
          activeUsers: 15 + ((day + tenant.name.length) % 20),
          logbooksSubmitted: 2 + (day % 5),
          docsUploaded: 3 + (day % 6),
          applicationsCreated: 1 + (day % 4)
        }
      });
    }
  }

  const extraTickets: { orgId: string; createdByUserId: string }[] = [];
  for (let i = 0; i < 15; i++) {
    const org = tenants[i % tenants.length];
    const creator = i % 2 === 0 ? platformSupport : platformSales;
    extraTickets.push({ orgId: org.id, createdByUserId: creator.id });
  }

  for (let i = 0; i < extraTickets.length; i++) {
    const t = await prisma.ticket.create({
      data: {
        userId: platformSupport.id,
        orgId: extraTickets[i].orgId,
        createdByUserId: extraTickets[i].createdByUserId,
        title: `HQ Ticket ${i + 1}`,
        summary: "Tenant requested assistance",
        status: i % 3 === 0 ? TicketStatus.IN_PROGRESS : TicketStatus.OPEN,
        priority: i % 4 === 0 ? TicketPriority.HIGH : TicketPriority.MEDIUM,
        category: i % 2 === 0 ? TicketCategory.ONBOARDING : TicketCategory.TECHNICAL
      }
    });
    await prisma.ticketEvent.createMany({
      data: [
        { ticketId: t.id, type: "CREATED", event: "Ticket created", payload: { by: "seed" } },
        { ticketId: t.id, type: "NOTE", event: "Initial triage complete", payload: { owner: "support" } }
      ]
    });
  }

  await prisma.auditLog.createMany({
    data: [
      { userId: demoStudent.id, actorUserId: demoStudent.id, scope: AuditScope.ORG, orgId: tenants[0].id, action: "LOGIN_OTP_REQUESTED" },
      { userId: demoStudent.id, actorUserId: demoStudent.id, scope: AuditScope.ORG, orgId: tenants[0].id, action: "LOGIN_OTP_VERIFIED" },
      { userId: platformAdmin.id, actorUserId: platformAdmin.id, scope: AuditScope.PLATFORM, orgId: tenants[0].id, action: "HQ_DASHBOARD_VIEWED" },
      { userId: platformSales.id, actorUserId: platformSales.id, scope: AuditScope.PLATFORM, orgId: tenants[2].id, action: "HQ_MEETING_CREATED" },
      { userId: platformOps.id, actorUserId: platformOps.id, scope: AuditScope.PLATFORM, orgId: tenants[1].id, action: "HQ_TICKET_ESCALATED_OPS" }
    ]
  });
}

main().finally(async () => prisma.$disconnect());
