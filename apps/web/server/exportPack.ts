import { prisma } from "@internflow/db/src";
import { generateCloseoutZipForJob } from "@/lib/closeout-export";
import { obsCreateSignedDownloadUrl } from "@/lib/obs";

export async function buildAndStoreExportPack(jobId: string, actorUserId?: string) {
  const zipBuffer = await generateCloseoutZipForJob(jobId);
  const job = await prisma.programmeExportJob.findUnique({ where: { id: jobId } });
  if (!job?.zipObsKey) {
    throw new Error("Export ZIP key missing after generation");
  }

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

  const signedUrl = await obsCreateSignedDownloadUrl(job.zipObsKey, 60 * 10);
  return {
    jobId,
    zipObsKey: job.zipObsKey,
    sizeBytes: zipBuffer.length,
    signedUrl
  };
}
