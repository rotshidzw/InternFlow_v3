import { prisma } from "@internflow/db/src";
import { getStorageAdapter } from "@internflow/shared/src/storage";
import { NextRequest, NextResponse } from "next/server";

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

export async function GET(req: NextRequest, { params }: { params: { orgSlug: string } }) {
  const context = await getTenantContext(req, params.orgSlug);
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "jobId is required" }, { status: 400 });

  const job = await prisma.programmeExportJob.findFirst({
    where: { id: jobId, tenantId: context.membership.organizationId }
  });

  if (!job || !job.zipObsKey || job.status !== "DONE") {
    return NextResponse.json({ error: "Export not ready" }, { status: 404 });
  }

  const signedUrl = await getStorageAdapter().getSignedUrl(job.zipObsKey);

  await prisma.auditEvent.create({
    data: {
      tenantId: context.membership.organizationId,
      userId: context.user.id,
      action: "EXPORT_DOWNLOADED",
      entityType: "ProgrammeExportJob",
      entityId: job.id,
      metadata: { zipObsKey: job.zipObsKey }
    }
  });

  return NextResponse.json({ url: signedUrl });
}
