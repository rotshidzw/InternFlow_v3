import { prisma } from "@internflow/db/src";
import { getStorageAdapter } from "@internflow/shared/src/storage";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type IncludeRules = {
  attendance?: boolean;
  learnerRegister?: boolean;
  beneficiaries?: boolean;
  documents?: boolean;
  logbooks?: boolean;
  payslips?: boolean;
  images?: boolean;
};

type StructureTemplate = {
  docFolders?: string[];
};

function sanitize(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function csv(rows: Array<Array<string | number>>) {
  return rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

function simplePdf(lines: string[]) {
  const escaped = lines.map((line) => line.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)"));
  const stream = ["BT", "/F1 16 Tf", "50 780 Td", `(${escaped[0] ?? "Programme Close-Out Report"}) Tj`, "/F1 11 Tf"];
  escaped.slice(1).forEach((line, index) => {
    stream.push(`0 -${28 + index * 18} Td`);
    stream.push(`(${line}) Tj`);
  });
  stream.push("ET");
  const content = stream.join("\n");
  const len = Buffer.byteLength(content, "utf8");

  const pdf = `%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n5 0 obj << /Length ${len} >> stream\n${content}\nendstream endobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000063 00000 n \n0000000122 00000 n \n0000000248 00000 n \n0000000318 00000 n \ntrailer << /Root 1 0 R /Size 6 >>\nstartxref\n${318 + len + 40}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

async function writeBytes(baseDir: string, relPath: string, content: Buffer | string) {
  const full = path.join(baseDir, relPath);
  await execFileAsync("mkdir", ["-p", path.dirname(full)]);
  await writeFile(full, content);
}

export async function generateExportZip(jobId: string) {
  const storage = getStorageAdapter();
  const job = await prisma.programmeExportJob.findUnique({
    where: { id: jobId },
    include: { tenant: true, programme: true, exportTemplate: true }
  });

  if (!job) throw new Error("Export job not found");

  await prisma.programmeExportJob.update({ where: { id: job.id }, data: { status: "RUNNING", errorMessage: null } });

  const includeRules = (job.exportTemplate.includeRulesJson ?? {}) as IncludeRules;
  const structure = (job.exportTemplate.structureJson ?? {}) as StructureTemplate;
  const docFolders = structure.docFolders ?? ["01_ID", "02_Attendance_Register", "03_Beneficiary_Forms", "04_Qualifications", "05_Logbooks", "06_Images", "07_Reports"];

  const enrollments = await prisma.enrollment.findMany({
    where: { organizationId: job.tenantId, programId: job.programmeId },
    include: { user: true }
  });

  const learnerIds = enrollments.map((enrollment) => enrollment.userId);
  const [documents, logbookEntries] = await Promise.all([
    prisma.document.findMany({
      where: { organizationId: job.tenantId, userId: { in: learnerIds } },
      include: { versions: { orderBy: { createdAt: "desc" } }, user: true }
    }),
    prisma.logbookEntry.findMany({
      where: { userId: { in: learnerIds } },
      include: { approvals: true }
    })
  ]);

  const workDir = await mkdtemp(path.join(os.tmpdir(), "internflow-closeout-"));
  const evidenceRows: Array<Array<string | number>> = [["FolderPath", "FileName", "LearnerId", "DocType", "UploadedAt", "Version", "Hash(optional)"]];
  const attendanceRows: Array<Array<string | number>> = [["Learner", "Email", "Logbook Entries", "Approved Entries"]];
  const learnerRows: Array<Array<string | number>> = [["Learner ID", "Name", "Email", "Enrollment Status"]];
  const beneficiaryRows: Array<Array<string | number>> = [["Learner ID", "Name", "Programme", "Tenant"]];

  try {
    for (const enrollment of enrollments) {
      const learnerName = enrollment.user.name ?? enrollment.user.email;
      const learnerFolder = `${sanitize(learnerName.split(" ").slice(-1)[0] ?? "Learner")}_${sanitize(learnerName.split(" ").slice(0, 1)[0] ?? "Unknown")}_${sanitize(enrollment.user.id.slice(0, 8))}`;
      const learnerPathRoot = `Learners/${learnerFolder}`;

      const learnerDocs = documents.filter((document) => document.userId === enrollment.userId);
      const learnerLogbooks = logbookEntries.filter((entry) => entry.userId === enrollment.userId);

      learnerRows.push([enrollment.user.id, learnerName, enrollment.user.email, enrollment.status]);
      beneficiaryRows.push([enrollment.user.id, learnerName, job.programme.name, job.tenant.name]);
      attendanceRows.push([
        learnerName,
        enrollment.user.email,
        learnerLogbooks.length,
        learnerLogbooks.filter((entry) => entry.approvals.some((approval) => approval.status === "APPROVED")).length
      ]);

      if (includeRules.documents !== false) {
        for (const doc of learnerDocs) {
          const latestVersion = doc.versions[0];
          if (!latestVersion) continue;
          if (!includeRules.payslips && doc.type === "PAYSLIP") continue;
          if (!includeRules.images && latestVersion.mimeType.startsWith("image/")) continue;

          const folder = doc.type === "ID" ? docFolders[0] : doc.type === "PAYSLIP" ? docFolders[2] : docFolders[3];
          const extension = latestVersion.mimeType.includes("pdf") ? "pdf" : latestVersion.mimeType.split("/")[1] ?? "bin";
          const fileName = `${doc.type}_${doc.id}.${extension}`;
          const relPath = `${learnerPathRoot}/${folder}/${fileName}`;

          try {
            await writeBytes(workDir, relPath, await storage.getBuffer(latestVersion.storageKey));
          } catch {
            await writeBytes(workDir, `${relPath}.missing.txt`, `Missing source object: ${latestVersion.storageKey}`);
          }

          evidenceRows.push([`${learnerPathRoot}/${folder}`, fileName, enrollment.user.id, doc.type, doc.createdAt.toISOString(), 1, ""]);
        }
      }

      if (includeRules.logbooks) {
        for (const entry of learnerLogbooks) {
          const fileName = `Logbook_${formatDate(entry.weekStart)}.txt`;
          const relPath = `${learnerPathRoot}/${docFolders[4]}/${fileName}`;
          await writeBytes(workDir, relPath, entry.summary);
          evidenceRows.push([`${learnerPathRoot}/${docFolders[4]}`, fileName, enrollment.user.id, "LOGBOOK", entry.createdAt.toISOString(), 1, ""]);
        }
      }
    }

    if (includeRules.attendance !== false) {
      await writeBytes(workDir, `${docFolders[1]}/Attendance_Register.xlsx`, csv(attendanceRows));
      evidenceRows.push([docFolders[1], "Attendance_Register.xlsx", "", "REGISTER", new Date().toISOString(), 1, ""]);
    }

    if (includeRules.learnerRegister !== false) {
      await writeBytes(workDir, `Registers/Learner_Register.xlsx`, csv(learnerRows));
      evidenceRows.push(["Registers", "Learner_Register.xlsx", "", "REGISTER", new Date().toISOString(), 1, ""]);
    }

    if (includeRules.beneficiaries !== false) {
      await writeBytes(workDir, `Registers/Beneficiary_Register.xlsx`, csv(beneficiaryRows));
      evidenceRows.push(["Registers", "Beneficiary_Register.xlsx", "", "REGISTER", new Date().toISOString(), 1, ""]);
    }

    const reportPdf = simplePdf([
      "Programme Close-Out Report",
      `Tenant: ${job.tenant.name}`,
      `Programme: ${job.programme.name}`,
      `Learners included: ${enrollments.length}`,
      `Generated at: ${new Date().toISOString()}`
    ]);
    await writeBytes(workDir, `${docFolders[6]}/Programme_CloseOut_Report.pdf`, reportPdf);
    evidenceRows.push([docFolders[6], "Programme_CloseOut_Report.pdf", "", "REPORT", new Date().toISOString(), 1, ""]);

    await writeBytes(workDir, "Evidence_Index.xlsx", csv(evidenceRows));

    const zipName = `${sanitize(job.tenant.name)}_${sanitize(job.programme.name)}_${formatDate(job.programme.startDate)}-${formatDate(job.programme.endDate)}_CloseOut.zip`;
    const zipPath = path.join(workDir, zipName);
    await execFileAsync("zip", ["-qr", zipPath, "."], { cwd: workDir });
    const zipBuffer = await readFile(zipPath);

    const prefix = `exports/${job.tenantId}/${job.programmeId}/${job.id}`;
    const zipObsKey = `${prefix}/${zipName}`;
    const reportPdfObsKey = `${prefix}/Programme_CloseOut_Report.pdf`;

    await storage.put(zipObsKey, zipBuffer, "application/zip");
    await storage.put(reportPdfObsKey, reportPdf, "application/pdf");

    await prisma.programmeExportJob.update({
      where: { id: job.id },
      data: { status: "DONE", zipObsKey, reportPdfObsKey, finishedAt: new Date(), errorMessage: null }
    });

    await prisma.auditEvent.create({
      data: {
        tenantId: job.tenantId,
        userId: job.createdByUserId,
        action: "EXPORT_JOB_COMPLETED",
        entityType: "ProgrammeExportJob",
        entityId: job.id,
        metadata: { zipObsKey, reportPdfObsKey }
      }
    });
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
