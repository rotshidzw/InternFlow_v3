import { prisma } from "@internflow/db/src";
import { getStorageAdapter } from "@internflow/shared/src/storage";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

function sanitize(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function extractProfileValue(profile: { education: unknown; experience: unknown } | null | undefined, path: "idNumber" | "dateOfBirth" | "cvUrl") {
  const education = (profile?.education ?? {}) as Record<string, unknown>;
  const experience = (profile?.experience ?? {}) as Record<string, unknown>;
  const personalDetails = (education.personalDetails ?? {}) as Record<string, unknown>;

  if (path === "cvUrl") {
    return (experience.cvUrl as string | undefined) ?? "";
  }

  const source = path in education ? education : personalDetails;
  return (source[path] as string | undefined) ?? "";
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
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

function excelColumn(index: number) {
  let n = index;
  let value = "";
  while (n > 0) {
    const mod = (n - 1) % 26;
    value = String.fromCharCode(65 + mod) + value;
    n = Math.floor((n - 1) / 26);
  }
  return value;
}

function buildSheetXml(rows: string[][]) {
  const rowXml = rows
    .map((row, rowIndex) => {
      const cellXml = row
        .map((cell, cellIndex) => {
          const ref = `${excelColumn(cellIndex + 1)}${rowIndex + 1}`;
          return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cellXml}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetData>${rowXml}</sheetData>
</worksheet>`;
}

function createXlsxBuffer(rows: string[][]) {
  const sheetXml = buildSheetXml(rows);

  const entries: ZipEntry[] = [
    {
      name: "[Content_Types].xml",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`, "utf8")
    },
    {
      name: "_rels/.rels",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`, "utf8")
    },
    {
      name: "docProps/core.xml",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Learner Register</dc:title>
  <dc:creator>InternFlow</dc:creator>
  <cp:lastModifiedBy>InternFlow</cp:lastModifiedBy>
</cp:coreProperties>`, "utf8")
    },
    {
      name: "docProps/app.xml",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>InternFlow</Application>
</Properties>`, "utf8")
    },
    {
      name: "xl/workbook.xml",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Learner Register" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`, "utf8")
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`, "utf8")
    },
    {
      name: "xl/styles.xml",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf/></cellStyleXfs>
  <cellXfs count="1"><xf xfId="0"/></cellXfs>
</styleSheet>`, "utf8")
    },
    { name: "xl/worksheets/sheet1.xml", data: Buffer.from(sheetXml, "utf8") }
  ];

  return createZipBuffer(entries);
}

function createDocxBuffer(lines: string[]) {
  const paragraphs = lines
    .map((line) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`)
    .join("");

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 wp14">
  <w:body>
    ${paragraphs}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  return createZipBuffer([
    {
      name: "[Content_Types].xml",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`, "utf8")
    },
    {
      name: "_rels/.rels",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`, "utf8")
    },
    { name: "word/document.xml", data: Buffer.from(documentXml, "utf8") }
  ]);
}

function createPdfBuffer(title: string, lines: string[]) {
  const safe = [title, ...lines].map((line) => line.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)"));
  const content = [
    "BT",
    "/F1 14 Tf",
    "50 790 Td",
    `(${safe[0]}) Tj`,
    "/F1 10 Tf",
    ...safe.slice(1).flatMap((line, idx) => [`50 ${770 - idx * 14} Td`, `(${line}) Tj`]),
    "ET"
  ].join("\n");

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${Buffer.byteLength(content, "utf8")} >> stream\n${content}\nendstream endobj`
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${obj}\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
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
    const [enrollments, docs, logoDoc] = await Promise.all([
      prisma.enrollment.findMany({
        where: { organizationId: job.tenantId, programId: job.programmeId },
        include: { user: { include: { studentProfile: true } }, program: true }
      }),
      prisma.document.findMany({ where: { organizationId: job.tenantId }, include: { versions: true } }),
      prisma.organizationDocument.findFirst({ where: { orgId: job.tenantId, category: { contains: "LOGO" } } })
    ]);

    const learnerIds = enrollments.map((item) => item.userId);
    const [actualLogbooks, approvedLogbooksCount] = await Promise.all([
      prisma.logbookEntry.findMany({ where: { userId: { in: learnerIds } } }),
      prisma.logbookApproval.count({ where: { entry: { userId: { in: learnerIds } }, status: "APPROVED" } })
    ]);

    const headerRows = [
      ["Programme Attendance Register"],
      ["Tenant", job.tenant.name],
      ["Programme", job.programme.name],
      ["Reporting period", `${job.programme.startDate.toISOString().slice(0, 10)} to ${job.programme.endDate.toISOString().slice(0, 10)}`],
      ["Prepared on", new Date().toISOString().slice(0, 10)],
      []
    ];

    const registerRows = [
      ...headerRows,
      [
        "#",
        "Learner Name",
        "Learner ID",
        "Email",
        "Phone",
        "Status",
        "Programme",
        "Training Signature",
        "Workplace Signature",
        "Manager Signature"
      ],
      ...enrollments.map((row, index) => [
        String(index + 1),
        row.user.studentProfile?.fullName ?? row.user.name ?? "",
        extractProfileValue(row.user.studentProfile, "idNumber") || "N/A",
        row.user.email,
        row.user.studentProfile?.phone ?? "",
        row.status,
        row.program.name,
        "",
        "",
        ""
      ])
    ].map((row) => row.map((cell) => String(cell ?? "")));

    const learnerProfileRows = [
      ["Learner Profile Register"],
      [],
      ["Learner ID", "Full Name", "Email", "Phone", "Location", "Bio", "ID Number", "Date of Birth", "CV / Portfolio"],
      ...enrollments.map((row) => [
        row.userId,
        row.user.studentProfile?.fullName ?? row.user.name ?? "",
        row.user.email,
        row.user.studentProfile?.phone ?? "",
        row.user.studentProfile?.location ?? "",
        row.user.studentProfile?.bio ?? "",
        extractProfileValue(row.user.studentProfile, "idNumber"),
        extractProfileValue(row.user.studentProfile, "dateOfBirth"),
        extractProfileValue(row.user.studentProfile, "cvUrl")
      ])
    ].map((row) => row.map((cell) => String(cell ?? "")));

    const xlsxBuffer = createXlsxBuffer(registerRows);
    const learnerProfileXlsxBuffer = createXlsxBuffer(learnerProfileRows);

    const docsByType = docs.reduce<Record<string, number>>((acc, item) => {
      acc[item.type] = (acc[item.type] ?? 0) + 1;
      return acc;
    }, {});

    const reportLines = [
      `${job.tenant.name} Programme Close-Out Report`,
      "",
      `Programme Name: ${job.programme.name}`,
      `Reporting Period: ${job.programme.startDate.toISOString().slice(0, 10)} to ${job.programme.endDate.toISOString().slice(0, 10)}`,
      `Prepared On: ${new Date().toISOString().slice(0, 10)}`,
      "",
      "Executive Summary",
      `This report provides a close-out overview for ${job.tenant.name}'s ${job.programme.name}. The pack is generated per tenant scope and includes learner register data and supporting report files for submission to funders and quality assurance stakeholders.`,
      "",
      "Programme Performance Statistics",
      `- Total learners enrolled: ${enrollments.length}`,
      `- Total learner documents on file: ${docs.length}`,
      `- Total logbook entries submitted: ${actualLogbooks.length}`,
      `- Total approved logbook entries: ${approvedLogbooksCount}`,
      `- Document type distribution: ${Object.keys(docsByType).length === 0 ? "No documents uploaded" : Object.entries(docsByType).map(([k, v]) => `${k} (${v})`).join(", ")}`,
      "",
      "Branding",
      logoDoc ? "- Company logo included in this export bundle under 07_Reports/." : "- Company logo not yet uploaded in InternFlow. Please add the approved logo manually in the section below.",
      "",
      "Submission Checklist (Editable)",
      "- [ ] Funder-specific cover letter attached",
      "- [ ] Final attendance reconciled",
      "- [ ] Beneficiary forms verified",
      "- [ ] Remaining stakeholder approvals captured",
      "",
      "Management Commentary (Editable)",
      "<Add management commentary and final sign-off notes here>",
      "",
      "Prepared by:",
      `${job.tenant.name} Coordination Team`,
      "",
      "Authorised by:",
      "<Insert name, title, and signature>",
      ""
    ];

    const docxBuffer = createDocxBuffer(reportLines);
    const pdfBuffer = createPdfBuffer(`${job.tenant.name} - ${job.programme.name} Close-Out`, reportLines.slice(2, 24));

    const zipEntries: ZipEntry[] = [
      { name: "01_ID/.keep", data: Buffer.from("keep") },
      { name: "02_Attendance_Register/Learner_Register_Designed.xlsx", data: xlsxBuffer },
      { name: "02_Attendance_Register/Learner_Profile_Register.xlsx", data: learnerProfileXlsxBuffer },
      { name: "03_Group_Documents/.keep", data: Buffer.from("keep") },
      { name: "04_Learner_Documents/.keep", data: Buffer.from("keep") },
      { name: "07_Reports/Programme_CloseOut_Report.docx", data: docxBuffer },
      { name: "07_Reports/Programme_CloseOut_Report.pdf", data: pdfBuffer }
    ];



    for (const enrollment of enrollments) {
      const profileName = enrollment.user.studentProfile?.fullName ?? enrollment.user.name ?? enrollment.user.email;
      const folder = sanitize(`${profileName}_${enrollment.userId}`);
      const learnerDocs = docs.filter((doc) => doc.userId === enrollment.userId);

      if (learnerDocs.length === 0) {
        zipEntries.push({
          name: `04_Learner_Documents/${folder}/README.txt`,
          data: Buffer.from("No learner documents have been uploaded yet. Add signed registers, ID, CV, and supporting institutional records.")
        });
        continue;
      }

      const summaryLines = [
        `Learner: ${profileName}`,
        `Email: ${enrollment.user.email}`,
        `ID Number: ${extractProfileValue(enrollment.user.studentProfile, "idNumber") || "Not captured"}`,
        "",
        "Documents in this folder:"
      ];

      learnerDocs.forEach((doc, index) => {
        summaryLines.push(`${index + 1}. ${doc.type} (${doc.status})`);
        if (doc.versions[0]?.storageKey) {
          summaryLines.push(`   fileKey: ${doc.versions[0].storageKey}`);
        }
      });

      zipEntries.push({
        name: `04_Learner_Documents/${folder}/Learner_Document_Index.txt`,
        data: Buffer.from(summaryLines.join("\n"), "utf8")
      });
    }

    const groupSummary = [
      `Tenant: ${job.tenant.name}`,
      `Programme: ${job.programme.name}`,
      `Total learners: ${enrollments.length}`,
      `Total documents: ${docs.length}`,
      "",
      "Document distribution by type:"
    ];

    Object.entries(docsByType).forEach(([type, count]) => {
      groupSummary.push(`- ${type}: ${count}`);
    });

    zipEntries.push({ name: "03_Group_Documents/Programme_Document_Summary.txt", data: Buffer.from(groupSummary.join("\n"), "utf8") });

    if (logoDoc?.fileKey) {
      try {
        const logo = await getStorageAdapter().getBuffer(logoDoc.fileKey);
        const ext = logoDoc.fileKey.split(".").pop() ?? "bin";
        zipEntries.push({ name: `07_Reports/Company_Logo.${sanitize(ext)}`, data: logo });
      } catch (error) {
        console.warn("[closeout-export] failed to include logo asset", { jobId, fileKey: logoDoc.fileKey, error });
      }
    }

    const zipBuffer = createZipBuffer(zipEntries);

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
        metadata: {
          mode: "localtmp",
          zipPath,
          learnerCount: enrollments.length,
          documentCount: docs.length,
          logbookCount: actualLogbooks.length,
          approvedLogbookCount: approvedLogbooksCount
        }
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
