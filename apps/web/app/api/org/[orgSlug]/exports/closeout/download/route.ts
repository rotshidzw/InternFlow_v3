import { prisma } from "@internflow/db/src";
import { getStorageAdapter } from "@internflow/shared/src/storage";
import { NextRequest, NextResponse } from "next/server";
import { requireTenantApiActor } from "@/lib/tenant-api-auth";

export async function GET(req: NextRequest, { params }: { params: { orgSlug: string } }) {
  const actor = await requireTenantApiActor(params.orgSlug);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "jobId is required" }, { status: 400 });

  const job = await prisma.programmeExportJob.findFirst({
    where: { id: jobId, tenantId: actor.membership.organizationId },
  });

  if (!job || !job.zipObsKey || job.status !== "DONE") {
    return NextResponse.json({ error: "Export not ready" }, { status: 404 });
  }

  const signedUrl = await getStorageAdapter().getSignedUrl(job.zipObsKey);

  await prisma.auditEvent.create({
    data: {
      tenantId: actor.membership.organizationId,
      userId: actor.user.id,
      action: "EXPORT_DOWNLOADED",
      entityType: "ProgrammeExportJob",
      entityId: job.id,
      metadata: { zipObsKey: job.zipObsKey },
    },
  });

  return NextResponse.json({ url: signedUrl });
}
