import { prisma } from "@internflow/db/src";
import { NextRequest } from "next/server";
import { readZipFromJob } from "@/lib/closeout-export";
import {
  TENANT_ROLE_GROUPS,
  resolveTenantApiActor,
  tenantApiAuthErrorResponse,
} from "@/lib/tenant-api-auth";

export async function GET(_: NextRequest, { params }: { params: { jobId: string } }) {
  const record = await readZipFromJob(params.jobId);
  if (!record) return new Response("Export not ready", { status: 404 });

  const actor = await resolveTenantApiActor({
    organizationId: record.job.tenantId,
    allowedRoles: TENANT_ROLE_GROUPS.EXPORT_READ,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  console.info("[closeout-export] download attempt", {
    jobId: params.jobId,
    tenantId: record.job.tenantId,
    userId: actor.actor.user.id,
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: record.job.tenantId,
      userId: actor.actor.user.id,
      action: "EXPORT_DOWNLOADED",
      entityType: "ProgrammeExportJob",
      entityId: record.job.id,
      metadata: { sizeBytes: record.bytes.length }
    }
  });

  return new Response(record.bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${record.fileName}"`,
      "Content-Length": String(record.bytes.length),
      "Cache-Control": "no-store"
    }
  });
}
