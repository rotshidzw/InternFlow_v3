import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "demo-org" },
    update: {},
    create: { name: "Demo Training Org", slug: "demo-org" }
  });

  const users = [
    { email: "student@demo.com", role: Role.STUDENT, name: "Sam Student" },
    { email: "coordinator@demo.com", role: Role.COORDINATOR, name: "Casey Coordinator" },
    { email: "supervisor@demo.com", role: Role.SUPERVISOR, name: "Sydney Supervisor" },
    { email: "provider@demo.com", role: Role.PROVIDER_ADMIN, name: "Priya Provider" },
    { email: "admin@demo.com", role: Role.SYSTEM_ADMIN, name: "Alex Admin" }
  ];

  for (const entry of users) {
    const user = await prisma.user.upsert({
      where: { email: entry.email },
      update: { role: entry.role, name: entry.name },
      create: entry
    });

    await prisma.membership.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: org.id
        }
      },
      update: { role: entry.role },
      create: {
        userId: user.id,
        organizationId: org.id,
        role: entry.role
      }
    });

    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        phone: "+27 00 000 0000",
        education: "Diploma in Informatics",
        emergencyContact: "Emergency Contact"
      }
    });
  }

  const program = await prisma.program.create({
    data: {
      organizationId: org.id,
      name: "Digital Skills Learnership",
      description: "12 month workplace-integrated learning track",
      startDate: new Date(),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
    }
  });

  const opportunity = await prisma.opportunity.create({
    data: {
      programId: program.id,
      title: "Junior Full-stack Intern",
      description: "Work with a product team delivering citizen services.",
      capacity: 100
    }
  });

  const template = await prisma.checklistTemplate.create({
    data: {
      programId: program.id,
      name: "Default onboarding requirements",
      items: {
        createMany: {
          data: [
            { label: "Government ID", expiryDays: 3650 },
            { label: "Proof of Address", expiryDays: 90 },
            { label: "CV" },
            { label: "Affidavit", expiryDays: 90 }
          ]
        }
      }
    },
    include: { items: true }
  });

  const student = await prisma.user.findUniqueOrThrow({ where: { email: "student@demo.com" } });

  const application = await prisma.application.create({
    data: {
      userId: student.id,
      opportunityId: opportunity.id,
      status: "SUBMITTED",
      checklist: {
        create: {
          items: {
            createMany: {
              data: template.items.map((item) => ({ label: item.label, status: "PENDING" }))
            }
          }
        }
      }
    }
  });

  await prisma.chatThread.create({
    data: {
      userId: student.id,
      title: "WhatsApp Simulator: Sam Student",
      messages: {
        createMany: {
          data: [
            { role: "SYSTEM", body: "Hi Sam 👋 choose an option (1-5)." },
            { role: "USER", body: "1) Check my status", senderId: student.id },
            { role: "SYSTEM", body: "You have 4 pending onboarding checklist items." }
          ]
        }
      }
    }
  });

  await prisma.ticket.create({
    data: {
      userId: student.id,
      title: "Need support for affidavit upload",
      summary: "Learner asked support via WhatsApp simulator.",
      events: {
        create: [
          { event: "Ticket created from chat flow" },
          { event: `Linked application ${application.id}` }
        ]
      }
    }
  });

  await prisma.auditLog.createMany({
    data: [
      { userId: student.id, action: "LOGIN_OTP_REQUESTED" },
      { userId: student.id, action: "INVITE_ACCEPTED" }
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
