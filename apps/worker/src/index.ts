import { Worker } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "@internflow/db/src";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", { maxRetriesPerRequest: null });

const worker = new Worker(
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

worker.on("completed", (job) => console.log("Worker completed", job.id));
worker.on("failed", (job, error) => console.error("Worker failed", job?.id, error));

console.log("InternFlow worker started");
