import { prisma } from "@internflow/db/src";
import { NextRequest } from "next/server";
import { readZipFromJob } from "@/lib/closeout-export";

export async function GET(req: NextRequest, { params }: { params: { jobId: string } }) {
  const email = req.cookies.get("if_user")?.value;
  if (!email) return new Response("Unauthorized", { status: 401 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return new Response("Unauthorized", { status: 401 });

  const record = await readZipFromJob(params.jobId);
  if (!record) return new Response("Export not ready", { status: 404 });

  const membership = await prisma.membership.findFirst({
    where: {
      userId: user.id,
      organizationId: record.job.tenantId,
      role: { in: ["COORDINATOR", "PROVIDER_ADMIN"] }
    }
  });

  if (!membership) return new Response("Forbidden", { status: 403 });

  console.info("[closeout-export] download attempt", { jobId: params.jobId, tenantId: record.job.tenantId, userId: user.id });

  await prisma.auditEvent.create({
    data: {
      tenantId: record.job.tenantId,
      userId: user.id,
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
