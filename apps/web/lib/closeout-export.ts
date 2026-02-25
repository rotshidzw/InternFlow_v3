import { prisma } from "@internflow/db/src";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function sanitize(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function csv(rows: Array<Array<string | number>>) {
  return rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
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
  const packRoot = path.join(tmpRoot, "pack");

  try {
    await execFileAsync("mkdir", ["-p", path.join(packRoot, "01_ID")]);
    await execFileAsync("mkdir", ["-p", path.join(packRoot, "02_Attendance_Register")]);
    await execFileAsync("mkdir", ["-p", path.join(packRoot, "07_Reports")]);

    const enrollments = await prisma.enrollment.findMany({
      where: { organizationId: job.tenantId, programId: job.programmeId },
      include: { user: true }
    });

    const registerCsv = csv([
      ["LearnerId", "Name", "Email", "Status"],
      ...enrollments.map((row) => [row.userId, row.user.name ?? "", row.user.email, row.status])
    ]);

    await writeFile(path.join(packRoot, "02_Attendance_Register", "Learner_Register.xlsx"), registerCsv, "utf8");
    await writeFile(path.join(packRoot, "07_Reports", "Programme_CloseOut_Report.txt"), `Programme: ${job.programme.name}\nTenant: ${job.tenant.name}\nLearners: ${enrollments.length}\nGeneratedAt: ${new Date().toISOString()}\n`, "utf8");

    const zipName = buildDownloadFileName(job.tenant.name, job.programme.name);
    const zipPath = path.join(tmpRoot, zipName);

    console.info("[closeout-export] creating zip", { jobId, zipPath });
    await execFileAsync("zip", ["-qr", zipPath, "."], { cwd: packRoot });

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
    throw error;
  } finally {
    // cleanup folder tree but keep output zip for download route
    await rm(packRoot, { recursive: true, force: true });
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
