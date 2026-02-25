import { prisma } from "@internflow/db/src";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

function sanitize(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function csv(rows: Array<Array<string | number>>) {
  return rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
}

function crc32(input: Buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input[i];
    for (let j = 0; j < 8; j++) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toDosDateTime(value: Date) {
  const year = Math.max(1980, value.getUTCFullYear());
  const month = value.getUTCMonth() + 1;
  const day = value.getUTCDate();
  const hours = value.getUTCHours();
  const minutes = value.getUTCMinutes();
  const seconds = Math.floor(value.getUTCSeconds() / 2);

  const time = (hours << 11) | (minutes << 5) | seconds;
  const date = ((year - 1980) << 9) | (month << 5) | day;
  return { date, time };
}

type ZipEntry = { name: string; data: Buffer };

function createZipBuffer(entries: ZipEntry[]) {
  const now = toDosDateTime(new Date());
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = Buffer.from(entry.name, "utf8");
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(now.time, 10);
    localHeader.writeUInt16LE(now.date, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(size, 18);
    localHeader.writeUInt32LE(size, 22);
    localHeader.writeUInt16LE(nameBytes.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBytes, entry.data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(now.time, 12);
    centralHeader.writeUInt16LE(now.date, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(size, 20);
    centralHeader.writeUInt32LE(size, 24);
    centralHeader.writeUInt16LE(nameBytes.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBytes);
    offset += localHeader.length + nameBytes.length + size;
  }

  const centralSize = centralParts.reduce((sum, p) => sum + p.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, eocd]);
}

export function buildDownloadFileName(tenantName: string, programmeName: string) {
  return `${sanitize(tenantName)}_${sanitize(programmeName)}_CloseOut.zip`;
}

export async function generateCloseoutZipForJob(jobId: string) {
  const job = await prisma.programmeExportJob.findUnique({
    where: { id: jobId },
    include: { tenant: true, programme: true }
  });

  if (!job) throw new Error("Export job not found");

  console.info("[closeout-export] starting generation", { jobId, tenantId: job.tenantId, programmeId: job.programmeId });

  await prisma.programmeExportJob.update({
    where: { id: jobId },
    data: { status: "RUNNING", errorMessage: null }
  });

  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "internflow-closeout-"));

  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { organizationId: job.tenantId, programId: job.programmeId },
      include: { user: true }
    });

    const registerCsv = csv([
      ["LearnerId", "Name", "Email", "Status"],
      ...enrollments.map((row) => [row.userId, row.user.name ?? "", row.user.email, row.status])
    ]);

    const reportText = `Programme: ${job.programme.name}\nTenant: ${job.tenant.name}\nLearners: ${enrollments.length}\nGeneratedAt: ${new Date().toISOString()}\n`;

    const zipBuffer = createZipBuffer([
      { name: "01_ID/.keep", data: Buffer.from("keep") },
      { name: "02_Attendance_Register/Learner_Register.xlsx", data: Buffer.from(registerCsv, "utf8") },
      { name: "07_Reports/Programme_CloseOut_Report.txt", data: Buffer.from(reportText, "utf8") }
    ]);

    const zipName = buildDownloadFileName(job.tenant.name, job.programme.name);
    const zipPath = path.join(tmpRoot, zipName);

    console.info("[closeout-export] writing zip", { jobId, zipPath });
    await writeFile(zipPath, zipBuffer);

    await prisma.programmeExportJob.update({
      where: { id: jobId },
      data: {
        status: "DONE",
        zipObsKey: `localtmp:${zipPath}`,
        finishedAt: new Date(),
        errorMessage: null
      }
    });

    await prisma.auditEvent.create({
      data: {
        tenantId: job.tenantId,
        userId: job.createdByUserId,
        action: "EXPORT_JOB_COMPLETED",
        entityType: "ProgrammeExportJob",
        entityId: job.id,
        metadata: { mode: "localtmp", zipPath }
      }
    });

    console.info("[closeout-export] generation completed", { jobId, zipPath });
    return { zipPath, zipName };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown export failure";
    await prisma.programmeExportJob.update({
      where: { id: jobId },
      data: { status: "FAILED", finishedAt: new Date(), errorMessage: message.slice(0, 2000) }
    });
    console.error("[closeout-export] generation failed", { jobId, message });
    await rm(tmpRoot, { recursive: true, force: true });
    throw error;
  }
}

export async function readZipFromJob(jobId: string) {
  const job = await prisma.programmeExportJob.findUnique({
    where: { id: jobId },
    include: { tenant: true, programme: true }
  });
  if (!job || job.status !== "DONE" || !job.zipObsKey) return null;
  if (!job.zipObsKey.startsWith("localtmp:")) return null;

  const zipPath = job.zipObsKey.replace("localtmp:", "");
  const bytes = await readFile(zipPath);
  const fileName = buildDownloadFileName(job.tenant.name, job.programme.name);
  return { bytes, fileName, job };
}
