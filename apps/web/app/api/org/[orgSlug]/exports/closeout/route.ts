import { prisma } from "@internflow/db/src";
import { NextRequest, NextResponse } from "next/server";
import { Queue } from "bullmq";
import IORedis from "ioredis";

const redisConnection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", { maxRetriesPerRequest: null });
const exportQueue = new Queue("programme-closeout-export", { connection: redisConnection });

async function getTenantContext(req: NextRequest, orgSlug: string) {
  const email = req.cookies.get("if_user")?.value;
  if (!email) return null;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, organization: { slug: orgSlug } },
    include: { organization: true }
  });

  if (!membership) return null;
  return { user, membership };
}

export async function POST(req: NextRequest, { params }: { params: { orgSlug: string } }) {
  const context = await getTenantContext(req, params.orgSlug);
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!["COORDINATOR", "PROVIDER_ADMIN"].includes(context.membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await req.json();
  const programmeId = String(payload.programmeId ?? "");
  const exportTemplateId = String(payload.exportTemplateId ?? "");

  const programme = await prisma.program.findFirst({
    where: { id: programmeId, organizationId: context.membership.organizationId }
  });
  if (!programme) return NextResponse.json({ error: "Programme not found" }, { status: 404 });

  const template = await prisma.exportTemplate.findFirst({
    where: { id: exportTemplateId, tenantId: context.membership.organizationId }
  });
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const job = await prisma.programmeExportJob.create({
    data: {
      tenantId: context.membership.organizationId,
      programmeId: programme.id,
      exportTemplateId: template.id,
      createdByUserId: context.user.id,
      status: "QUEUED"
    }
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: context.membership.organizationId,
      userId: context.user.id,
      action: "EXPORT_JOB_CREATED",
      entityType: "ProgrammeExportJob",
      entityId: job.id,
      metadata: { programmeId, exportTemplateId }
    }
  });

  await exportQueue.add("generate-closeout-export", { jobId: job.id });

  return NextResponse.json({ ok: true, jobId: job.id, status: job.status });
}

export async function GET(req: NextRequest, { params }: { params: { orgSlug: string } }) {
  const context = await getTenantContext(req, params.orgSlug);
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  if (jobId) {
    const job = await prisma.programmeExportJob.findFirst({
      where: { id: jobId, tenantId: context.membership.organizationId },
      include: { programme: true, exportTemplate: true }
    });

    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ job });
  }

  const jobs = await prisma.programmeExportJob.findMany({
    where: { tenantId: context.membership.organizationId },
    include: { programme: true, exportTemplate: true },
    orderBy: { createdAt: "desc" },
    take: 25
  });

  return NextResponse.json({ jobs });
}
