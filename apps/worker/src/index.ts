import { Worker } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "@internflow/db/src";
import { generateExportZip } from "./export-closeout";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", { maxRetriesPerRequest: null });

const notificationWorker = new Worker(
  "notifications",
  async (job) => {
    if (job.name === "send-reminder") {
      const { userId, title, body } = job.data as { userId: string; title: string; body: string };
      await prisma.notification.create({ data: { userId, title, body } });
      return { ok: true };
    }
    return { skipped: true };
  },
  { connection }
);

const scanWorker = new Worker(
  "document-scan",
  async (job) => {
    if (job.name !== "scanDocument") return { skipped: true };
    const { documentId, mimeType, sizeBytes, fileName } = job.data as { documentId: string; mimeType: string; sizeBytes: number; fileName: string };

    let status: "SCAN_OK" | "SCAN_FAILED" = "SCAN_OK";
    let note = "Heuristic scan passed";

    if (!mimeType.includes("pdf") && !mimeType.includes("image")) {
      status = "SCAN_FAILED";
      note = "Unsupported type for OCR";
    }

    if (sizeBytes < 1200) {
      status = "SCAN_FAILED";
      note = "File too small or unreadable";
    }

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status,
        rejectionReason: status === "SCAN_FAILED" ? note : null
      }
    });

    await prisma.auditLog.create({ data: { action: "DOCUMENT_SCANNED", metadata: { documentId, status, fileName, note } } });
    return { status, note };
  },
  { connection }
);

const closeoutExportWorker = new Worker(
  "programme-closeout-export",
  async (job) => {
    if (job.name !== "generate-closeout-export") return { skipped: true };
    const { jobId } = job.data as { jobId: string };

    try {
      await generateExportZip(jobId);
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown export failure";
      await prisma.programmeExportJob.update({
        where: { id: jobId },
        data: { status: "FAILED", finishedAt: new Date(), errorMessage: message.slice(0, 2000) }
      });
      throw error;
    }
  },
  { connection }
);

for (const worker of [notificationWorker, scanWorker, closeoutExportWorker]) {
  worker.on("completed", (job) => console.log("Worker completed", job.id));
  worker.on("failed", (job, error) => console.error("Worker failed", job?.id, error));
}

console.log("InternFlow workers started");
