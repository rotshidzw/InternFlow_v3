import { prisma } from "@internflow/db/src";
import { NextRequest, NextResponse } from "next/server";
import { generateCloseoutZipForJob } from "@/lib/closeout-export";
import { requireTenantApiActor } from "@/lib/tenant-api-auth";

const ALLOWED_ROLES = ["COORDINATOR", "PROVIDER_ADMIN"] as const;

export async function POST(req: NextRequest, { params }: { params: { orgSlug: string } }) {
  const actor = await requireTenantApiActor(params.orgSlug, [...ALLOWED_ROLES]);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await req.json();
  const programmeId = String(payload.programmeId ?? "");
  const exportTemplateId = String(payload.exportTemplateId ?? "");

  const programme = await prisma.program.findFirst({
    where: { id: programmeId, organizationId: actor.membership.organizationId },
  });
  if (!programme) return NextResponse.json({ error: "Programme not found" }, { status: 404 });

  const template = await prisma.exportTemplate.findFirst({
    where: { id: exportTemplateId, tenantId: actor.membership.organizationId },
  });
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const job = await prisma.programmeExportJob.create({
    data: {
      tenantId: actor.membership.organizationId,
      programmeId: programme.id,
      exportTemplateId: template.id,
      createdByUserId: actor.user.id,
      status: "QUEUED",
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: actor.membership.organizationId,
      userId: actor.user.id,
      action: "EXPORT_JOB_CREATED",
      entityType: "ProgrammeExportJob",
      entityId: job.id,
      metadata: { programmeId, exportTemplateId },
    },
  });

  try {
    await generateCloseoutZipForJob(job.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate export";
    return NextResponse.json({ error: "Close-out export generation failed", detail: message, jobId: job.id }, { status: 500 });
  }

  return NextResponse.json({ ok: true, jobId: job.id, status: "DONE" });
}

export async function GET(req: NextRequest, { params }: { params: { orgSlug: string } }) {
  const actor = await requireTenantApiActor(params.orgSlug);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  if (jobId) {
    const job = await prisma.programmeExportJob.findFirst({
      where: { id: jobId, tenantId: actor.membership.organizationId },
      include: { programme: true, exportTemplate: true },
    });

    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ job });
  }

  const jobs = await prisma.programmeExportJob.findMany({
    where: { tenantId: actor.membership.organizationId },
    include: { programme: true, exportTemplate: true },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  return NextResponse.json({ jobs });
}
