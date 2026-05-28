import { prisma } from "@internflow/db/src";
import { NextRequest } from "next/server";
import { getStorageAdapter } from "@internflow/shared/src/storage";
import { buildDownloadFileName } from "@/lib/closeout-export";
import {
  TENANT_ROLE_GROUPS,
  resolveTenantApiActor,
  tenantApiAuthErrorResponse,
} from "@/lib/tenant-api-auth";

export async function GET(_: NextRequest, { params }: { params: { jobId: string } }) {
  const job = await prisma.programmeExportJob.findUnique({
    where: { id: params.jobId },
    include: { tenant: true, programme: true },
  });
  if (!job || job.status !== "DONE" || !job.zipObsKey) return new Response("Export not ready", { status: 404 });

  const actor = await resolveTenantApiActor({
    organizationId: job.tenantId,
    allowedRoles: TENANT_ROLE_GROUPS.EXPORT_READ,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const bytes = await getStorageAdapter().getBuffer(job.zipObsKey);
  const fileName = buildDownloadFileName(job.tenant.name, job.programme.name);

  console.info("[closeout-export] download attempt", {
    jobId: params.jobId,
    tenantId: job.tenantId,
    userId: actor.actor.user.id,
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: job.tenantId,
      userId: actor.actor.user.id,
      action: "EXPORT_DOWNLOADED",
      entityType: "ProgrammeExportJob",
      entityId: job.id,
      metadata: { sizeBytes: bytes.length, zipObsKey: job.zipObsKey }
    }
  });

  return new Response(bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(bytes.length),
      "Cache-Control": "no-store"
    }
  });
}
