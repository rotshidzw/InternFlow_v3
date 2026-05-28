import { prisma } from "@internflow/db/src";
import { NextRequest, NextResponse } from "next/server";
import { Queue } from "bullmq";
import { createRedisClient } from "@/lib/redis-queue";
import {
  TENANT_ROLE_GROUPS,
  resolveTenantApiActor,
  tenantApiAuthErrorResponse,
} from "@/lib/tenant-api-auth";

const closeoutQueue = new Queue("programme-closeout-export", {
  connection: createRedisClient("api-closeout-export"),
});

export async function POST(req: NextRequest, { params }: { params: { orgSlug: string } }) {
  const actor = await resolveTenantApiActor({
    orgSlug: params.orgSlug,
    allowedRoles: TENANT_ROLE_GROUPS.CONTENT_MANAGE,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const payload = await req.json();
  const programmeId = String(payload.programmeId ?? "");
  const exportTemplateId = String(payload.exportTemplateId ?? "");

  const programme = await prisma.program.findFirst({
    where: { id: programmeId, organizationId: actor.actor.membership.organizationId },
  });
  if (!programme) return NextResponse.json({ error: "Programme not found" }, { status: 404 });

  const template = await prisma.exportTemplate.findFirst({
    where: { id: exportTemplateId, tenantId: actor.actor.membership.organizationId },
  });
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const job = await prisma.programmeExportJob.create({
    data: {
      tenantId: actor.actor.membership.organizationId,
      programmeId: programme.id,
      exportTemplateId: template.id,
      createdByUserId: actor.actor.user.id,
      status: "QUEUED",
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: actor.actor.membership.organizationId,
      userId: actor.actor.user.id,
      action: "EXPORT_JOB_CREATED",
      entityType: "ProgrammeExportJob",
      entityId: job.id,
      metadata: { programmeId, exportTemplateId },
    },
  });

  try {
    await closeoutQueue.add("generate-closeout-export", { jobId: job.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate export";
    await prisma.programmeExportJob.update({
      where: { id: job.id },
      data: { status: "FAILED", finishedAt: new Date(), errorMessage: message.slice(0, 2000) },
    });
    await prisma.auditEvent.create({
      data: {
        tenantId: actor.actor.membership.organizationId,
        userId: actor.actor.user.id,
        action: "EXPORT_JOB_QUEUE_FAILED",
        entityType: "ProgrammeExportJob",
        entityId: job.id,
        metadata: { error: message },
      },
    });
    return NextResponse.json({ error: "Close-out export queue failed", detail: message, jobId: job.id }, { status: 500 });
  }

  return NextResponse.json({ ok: true, jobId: job.id, status: "QUEUED" });
}

export async function GET(req: NextRequest, { params }: { params: { orgSlug: string } }) {
  const actor = await resolveTenantApiActor({
    orgSlug: params.orgSlug,
    allowedRoles: TENANT_ROLE_GROUPS.EXPORT_READ,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  if (jobId) {
    const job = await prisma.programmeExportJob.findFirst({
      where: { id: jobId, tenantId: actor.actor.membership.organizationId },
      include: { programme: true, exportTemplate: true },
    });

    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ job });
  }

  const jobs = await prisma.programmeExportJob.findMany({
    where: { tenantId: actor.actor.membership.organizationId },
    include: { programme: true, exportTemplate: true },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  return NextResponse.json({ jobs });
}
