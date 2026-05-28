import { prisma } from "@internflow/db/src";
import { getStorageAdapter } from "@internflow/shared/src/storage";

export async function buildAndStoreExportPack(jobId: string, actorUserId?: string) {
  const job = await prisma.programmeExportJob.findUnique({
    where: { id: jobId },
    select: { id: true, tenantId: true, zipObsKey: true, reportPdfObsKey: true, status: true },
  });
  if (!job || job.status !== "DONE" || !job.zipObsKey) {
    throw new Error("Export ZIP is not ready yet");
  }

  const zipBuffer = await getStorageAdapter().getBuffer(job.zipObsKey);

  if (actorUserId) {
    await prisma.auditEvent.create({
      data: {
        tenantId: job.tenantId,
        userId: actorUserId,
        action: "EXPORT_GENERATED",
        entityType: "ProgrammeExportJob",
        entityId: jobId,
        metadata: {
          zipObsKey: job.zipObsKey,
          reportPdfObsKey: job.reportPdfObsKey,
          sizeBytes: zipBuffer.length
        }
      }
    });
  }

  const signedUrl = await getStorageAdapter().getSignedUrl(job.zipObsKey);
  return {
    jobId,
    zipObsKey: job.zipObsKey,
    sizeBytes: zipBuffer.length,
    signedUrl
  };
}
