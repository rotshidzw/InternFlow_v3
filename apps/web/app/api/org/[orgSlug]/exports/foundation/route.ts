import { prisma } from "@internflow/db/src";
import { NextRequest, NextResponse } from "next/server";
import { requireTenantApiActor } from "@/lib/tenant-api-auth";

export async function GET(req: NextRequest, { params }: { params: { orgSlug: string } }) {
  const actor = await requireTenantApiActor(params.orgSlug);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = actor.membership.organizationId;
  const [programmes, enrollments, documents, certs, registers] = await Promise.all([
    prisma.program.findMany({ where: { organizationId: orgId }, select: { id: true, name: true } }),
    prisma.enrollment.count({ where: { organizationId: orgId } }),
    prisma.document.count({ where: { user: { memberships: { some: { organizationId: orgId } } } } }),
    prisma.document.count({ where: { type: "CERTIFICATE", user: { memberships: { some: { organizationId: orgId } } } } }),
    prisma.organizationDocument.count({ where: { orgId, category: "ATTENDANCE_REGISTER" } }),
  ]);

  const { searchParams } = new URL(req.url);
  const programmeId = searchParams.get("programmeId");

  const learnerRows = programmeId
    ? await prisma.enrollment.findMany({
        where: { organizationId: orgId, programId: programmeId },
        include: { user: { include: { documents: true } }, program: true },
        take: 1000,
      })
    : [];

  const evidenceIndex = learnerRows.map((row) => {
    const docs = row.user.documents;
    return {
      learnerId: row.userId,
      learnerName: row.user.name ?? row.user.email,
      programme: row.program.name,
      status: row.status,
      totalDocs: docs.length,
      ids: docs.filter((d) => d.type === "ID").length,
      cvs: docs.filter((d) => d.type === "CV").length,
      certificates: docs.filter((d) => d.type === "CERTIFICATE").length,
      payslips: docs.filter((d) => d.type === "PAYSLIP").length,
      rejectedDocs: docs.filter((d) => d.status === "REJECTED").length,
    };
  });

  return NextResponse.json({
    ok: true,
    summary: {
      programmes: programmes.length,
      enrollments,
      documents,
      certificates: certs,
      attendanceRegisters: registers,
    },
    programmes,
    evidenceIndex,
  });
}
