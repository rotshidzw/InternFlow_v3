import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { getOrgAccess } from "@/lib/org-access";
import { getStorageAdapter } from "@internflow/shared/src/storage";
import {
  applyCertificateReleaseTransitionsWithAudit,
  ensureFollowUpSchedulesForCompletedEnrollment,
  isReleaseDue,
  loadOrganizationCertificatePolicyRecords,
  loadOrganizationCertificateRecords,
  resolveCertificateReleaseAt,
  resolveCertificateReleaseRuleForProgram,
  resolveEnrollmentCompletionDate,
  saveOrganizationCertificateRecords,
  type CertificateRecord,
} from "@/lib/provider-operations";
import {
  TENANT_ROLE_GROUPS,
  isTenantRoleAllowed,
} from "@/lib/tenant-api-auth";

function escapePdfText(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function decodeDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], bytes: Buffer.from(match[2], "base64") };
}


function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") || "certificate";
}

function buildCertificateNumber(orgSlug: string, enrollmentId: string, issueDate: string) {
  const compactDate = issueDate.replaceAll("-", "");
  return `${orgSlug.toUpperCase()}-${compactDate}-${enrollmentId.slice(-6).toUpperCase()}`;
}

async function loadCertificatePdfFromDocument(documentId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { versions: { orderBy: { createdAt: "desc" }, take: 1 }, user: true },
  });
  if (!doc || !doc.versions[0]) return null;

  let bytes: Uint8Array;
  try {
    bytes = await getStorageAdapter().getBuffer(doc.versions[0].storageKey);
  } catch {
    return null;
  }

  const safeName = (doc.user.name ?? doc.user.email).replace(/[^a-zA-Z0-9._-]+/g, "_");
  return {
    bytes,
    fileName: `${safeName}_Certificate.pdf`,
    doc,
  };
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

function createZipBuffer(entries: Array<{ name: string; data: Buffer }>) {
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

function centerTextX(text: string, fontSize: number, weight = 0.52) {
  const pageWidth = 842;
  const estimatedWidth = text.length * fontSize * weight;
  return Math.max(48, Math.round((pageWidth - estimatedWidth) / 2));
}

function centerTextAtX(text: string, fontSize: number, centerX: number, weight = 0.52) {
  const estimatedWidth = text.length * fontSize * weight;
  return Math.round(centerX - estimatedWidth / 2);
}

function fitFontSize(text: string, maxSize: number, minSize: number, maxWidth: number, weight = 0.52) {
  let size = maxSize;
  while (size > minSize && text.length * size * weight > maxWidth) size -= 1;
  return size;
}

function certificatePdf(tenantName: string, learnerName: string, programmeName: string, managerName: string, signature: string, _hasImageSignature: boolean) {
  const safeTenant = escapePdfText(tenantName.toUpperCase());
  const safeLearner = escapePdfText(learnerName);
  const safeProgramme = escapePdfText(programmeName);
  const safeManager = escapePdfText(managerName);
  const safeSignature = escapePdfText(signature);
  const issueDate = new Date().toISOString().slice(0, 10);

  const headerText = `${safeTenant} PROGRAMME CERTIFICATION`;
  const titleText = "Certificate of Completion";
  const lineOneText = "This certifies that";
  const lineTwoText = "has successfully completed";

  const headerSize = fitFontSize(headerText, 16, 14, 620, 0.5);
  const titleSize = fitFontSize(titleText, 44, 34, 720, 0.5);
  const learnerSize = fitFontSize(safeLearner, 48, 30, 700, 0.5);
  const programmeSize = fitFontSize(safeProgramme, 32, 24, 640, 0.5);
  const signatureLine = `BT /F3 20 Tf 98 56 Td (${safeSignature}) Tj ET`;

  const stream = [
    // background + subtle glass gradient approximation
    "0.95 0.97 0.96 rg 0 0 842 595 re f",
    "0.93 0.97 0.95 rg 0 420 310 175 re f",

    // double border
    "0.79 0.70 0.49 RG 2 w 18 18 806 559 re S",
    "0.18 0.44 0.34 RG 3 w 30 30 782 535 re S",

    // top divider
    "0.18 0.44 0.34 RG 1.1 w 96 500 m 746 500 l S",

    // zone 1: header
    "0.23 0.36 0.31 rg",
    `BT /F1 ${headerSize} Tf ${centerTextX(headerText, headerSize, 0.50)} 512 Td (${headerText}) Tj ET`,

    // zone 2: centered body
    "0.12 0.18 0.23 rg",
    `BT /F2 ${titleSize} Tf ${centerTextX(titleText, titleSize, 0.49)} 428 Td (${titleText}) Tj ET`,
    "0.29 0.34 0.39 rg",
    `BT /F1 20 Tf ${centerTextX(lineOneText, 20, 0.50)} 338 Td (${lineOneText}) Tj ET`,
    "0.08 0.48 0.43 rg",
    `BT /F2 ${learnerSize} Tf ${centerTextX(safeLearner, learnerSize, 0.49)} 264 Td (${safeLearner}) Tj ET`,
    "0.29 0.34 0.39 rg",
    `BT /F1 20 Tf ${centerTextX(lineTwoText, 20, 0.50)} 204 Td (${lineTwoText}) Tj ET`,
    "0.12 0.16 0.22 rg",
    `BT /F2 ${programmeSize} Tf ${centerTextX(safeProgramme, programmeSize, 0.49)} 144 Td (${safeProgramme}) Tj ET`,
    `BT /F1 10 Tf ${centerTextX(`Completed on ${issueDate}`, 10, 0.5)} 132 Td (Completed on ${issueDate}) Tj ET`,

    // zone 3: left signature block
    "0.20 0.34 0.50 rg",
    "BT /F1 13 Tf 98 130 Td (AUTHORISED BY) Tj ET",
    "0.03 0.12 0.29 rg",
    `BT /F2 16 Tf 98 110 Td (${safeManager}) Tj ET`,
    "0.30 0.35 0.40 rg",
    "BT /F1 11 Tf 98 92 Td (Programme Coordinator) Tj ET",
    "0.16 0.20 0.28 RG 0.8 w 98 74 m 270 74 l S",
    "0.02 0.08 0.20 rg",
    signatureLine,

    // zone 3: right circular stamp
    "1.00 0.95 0.96 rg",
    "792 130 m 792 169.76 759.76 202 720 202 c 680.24 202 648 169.76 648 130 c 648 90.24 680.24 58 720 58 c 759.76 58 792 90.24 792 130 c f",
    "0.86 0.29 0.38 RG 4 w",
    "792 130 m 792 169.76 759.76 202 720 202 c 680.24 202 648 169.76 648 130 c 648 90.24 680.24 58 720 58 c 759.76 58 792 90.24 792 130 c S",
    "0.86 0.29 0.38 RG 1 w",
    "782 130 m 782 164.23 754.23 192 720 192 c 685.77 192 658 164.23 658 130 c 658 95.77 685.77 68 720 68 c 754.23 68 782 95.77 782 130 c S",
    "0.82 0.08 0.19 rg",
    `BT /F2 12 Tf ${centerTextAtX("OFFICIAL", 12, 720, 0.53)} 128 Td (OFFICIAL) Tj ET`,
    `BT /F2 12 Tf ${centerTextAtX("STAMP", 12, 720, 0.53)} 108 Td (STAMP) Tj ET`,
    `BT /F2 20 Tf ${centerTextAtX("*", 20, 720, 0.53)} 84 Td (*) Tj ET`,

    // footer divider + metadata
    "0.18 0.44 0.34 RG 0.9 w 86 34 m 756 34 l S",
    "0.35 0.40 0.45 rg",
    `BT /F1 10 Tf 644 20 Td (Issue Date: ${issueDate}) Tj ET`
  ].join("\n");

  const contentLength = Buffer.byteLength(stream, "utf8");

  const text = [
    "%PDF-1.4",
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R >> >> >> endobj",
    `4 0 obj << /Length ${contentLength} >> stream\n${stream}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    "6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj",
    "7 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Times-Italic >> endobj",
    "xref\n0 8\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000298 00000 n \n0000000000 00000 n \n0000000000 00000 n \n0000000000 00000 n ",
    "trailer << /Root 1 0 R /Size 8 >>",
    "startxref\n999\n%%EOF"
  ].join("\n");

  return Buffer.from(text, "utf8");
}


export async function GET(req: Request, { params }: { params: { orgSlug: string } }) {
  const access = await getOrgAccess(params.orgSlug);
  if ("error" in access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isStudent = access.membership.role === "STUDENT";
  const canManageCertificates = isTenantRoleAllowed(
    access.membership.role,
    TENANT_ROLE_GROUPS.APP_REVIEW,
  );
  const canReadExports = isTenantRoleAllowed(
    access.membership.role,
    TENANT_ROLE_GROUPS.EXPORT_READ,
  );

  if (!isStudent && !canReadExports && !canManageCertificates) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const programId = (url.searchParams.get("programId") ?? "").trim();
  const enrollmentId = (url.searchParams.get("enrollmentId") ?? "").trim();

  const tenantName = access.membership.organization.name;

  if (enrollmentId) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { id: enrollmentId, organizationId: access.membership.organizationId, status: "COMPLETED" },
      include: { user: true, program: true }
    });
    if (!enrollment) {
      return NextResponse.json({ error: "Completed enrollment not found for certificate download." }, { status: 404 });
    }

    await applyCertificateReleaseTransitionsWithAudit({
      organizationId: access.membership.organizationId,
      actorUserId: access.user.id,
    });

    const certificateRecords = await loadOrganizationCertificateRecords(
      access.membership.organizationId,
    );
    const linkedRecord = certificateRecords
      .filter((record) => record.enrollmentId === enrollment.id)
      .sort((a, b) => b.issueDate.localeCompare(a.issueDate))[0];

    if (linkedRecord?.documentId) {
      if (isStudent && linkedRecord.status !== "RELEASED") {
        return NextResponse.json(
          {
            error: "Certificate is issued but still under delayed release policy.",
            releaseAt: linkedRecord.releaseAt,
          },
          { status: 403 },
        );
      }

      const stored = await loadCertificatePdfFromDocument(linkedRecord.documentId);
      if (!stored) {
        return NextResponse.json({ error: "Certificate file is unavailable" }, { status: 404 });
      }

      await prisma.auditEvent.create({
        data: {
          tenantId: access.membership.organizationId,
          userId: access.user.id,
          action: "CERTIFICATE_VIEWED",
          entityType: "Certificate",
          entityId: linkedRecord.id,
          metadata: {
            enrollmentId: linkedRecord.enrollmentId,
            certificateNumber: linkedRecord.certificateNumber,
            status: linkedRecord.status,
          },
        },
      });

      return new Response(stored.bytes as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${stored.fileName}"`,
        },
      });
    }

    return NextResponse.json(
      { error: "Certificate has not been issued yet for this enrollment." },
      { status: 404 },
    );
  }

  if (isStudent) {
    return NextResponse.json(
      { error: "Students cannot bulk download certificates." },
      { status: 403 },
    );
  }

  await applyCertificateReleaseTransitionsWithAudit({
    organizationId: access.membership.organizationId,
    actorUserId: access.user.id,
  });

  const certificateRecords = await loadOrganizationCertificateRecords(
    access.membership.organizationId,
  );
  const scopedRecords = certificateRecords.filter(
    (record) =>
      Boolean(record.documentId) &&
      (!programId || record.programId === programId),
  );

  if (scopedRecords.length === 0) {
    return NextResponse.json(
      { error: "No issued certificates found for bulk download." },
      { status: 404 },
    );
  }

  const enrollments = await prisma.enrollment.findMany({
    where: {
      id: { in: scopedRecords.map((record) => record.enrollmentId) },
      organizationId: access.membership.organizationId,
    },
    include: { user: true, program: true },
  });
  const enrollmentById = new Map(enrollments.map((enrollment) => [enrollment.id, enrollment]));

  const entriesResolved = await Promise.all(
    scopedRecords.map(async (record) => {
      if (!record.documentId) return null;
      const enrollment = enrollmentById.get(record.enrollmentId);
      if (!enrollment) return null;

      const stored = await loadCertificatePdfFromDocument(record.documentId);
      if (!stored) return null;

      const learnerName = enrollment.user.name || enrollment.user.email;
      const programFolder = sanitizeFileName(enrollment.program.name || "Programme");
      const learnerFile = sanitizeFileName(
        `${learnerName}-${record.certificateNumber}.pdf`,
      );

      return {
        name: `${programFolder}/${learnerFile}`,
        data: Buffer.from(stored.bytes),
      };
    }),
  );
  const entries = entriesResolved.filter((entry) => Boolean(entry)) as Array<{
    name: string;
    data: Buffer<ArrayBufferLike>;
  }>;

  if (entries.length === 0) {
    return NextResponse.json(
      { error: "Issued certificate files are unavailable for export." },
      { status: 404 },
    );
  }

  const zip = createZipBuffer(entries);
  const filename = sanitizeFileName(`${tenantName}-${programId ? "programme" : "all"}-certificates.zip`);

  await prisma.auditEvent.create({
    data: {
      tenantId: access.membership.organizationId,
      userId: access.user.id,
      action: "CERTIFICATE_BULK_EXPORTED",
      entityType: "Organization",
      entityId: access.membership.organizationId,
      metadata: { programId: programId || null, count: entries.length },
    },
  });

  return new Response(zip, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}

export async function POST(req: Request, { params }: { params: { orgSlug: string } }) {
  const access = await getOrgAccess(params.orgSlug);
  if ("error" in access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canManageCertificates = isTenantRoleAllowed(
    access.membership.role,
    TENANT_ROLE_GROUPS.APP_REVIEW,
  );
  if (!canManageCertificates) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  let enrollmentId = "";
  let managerNameInput = "";
  let signatureInput = "";
  let tenantNameInput = "";
  let signatureImageBytes: Buffer | null = null;
  let signatureImageMime = "image/png";

  if (contentType.includes("application/json")) {
    const payload = (await req.json()) as { enrollmentId?: string; managerName?: string; signature?: string; tenantName?: string; signatureImageBase64?: string };
    enrollmentId = payload.enrollmentId ?? "";
    managerNameInput = payload.managerName ?? "";
    signatureInput = payload.signature ?? "";
    tenantNameInput = payload.tenantName ?? "";

    if (payload.signatureImageBase64) {
      const decoded = decodeDataUrl(payload.signatureImageBase64);
      if (decoded) {
        signatureImageBytes = decoded.bytes;
        signatureImageMime = decoded.mimeType;
      }
    }
  } else {
    const formData = await req.formData();
    enrollmentId = String(formData.get("enrollmentId") ?? "");
    managerNameInput = String(formData.get("managerName") ?? "");
    signatureInput = String(formData.get("signature") ?? "");
    tenantNameInput = String(formData.get("tenantName") ?? "");

    const signatureFile = formData.get("signatureImage");
    if (signatureFile instanceof File && signatureFile.size > 0) {
      signatureImageBytes = Buffer.from(await signatureFile.arrayBuffer());
      signatureImageMime = signatureFile.type || "image/png";
    }
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, organizationId: access.membership.organizationId },
    include: { user: true, program: true }
  });
  if (!enrollment) return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
  if (enrollment.status !== "COMPLETED") {
    return NextResponse.json({ error: "Enrollment must be COMPLETED before issuing certificate." }, { status: 409 });
  }

  const policyRecords = await loadOrganizationCertificatePolicyRecords(access.membership.organizationId);
  const releaseRule = resolveCertificateReleaseRuleForProgram(
    enrollment.programId,
    policyRecords,
  );
  const completionDate = (await resolveEnrollmentCompletionDate(enrollment.id)) ?? new Date();
  const releaseAtDate = resolveCertificateReleaseAt(completionDate, releaseRule);
  const certificateStatus = isReleaseDue(releaseAtDate) ? "RELEASED" : "ISSUED";

  const managerName = managerNameInput.trim() || access.user.name || "Programme Manager";
  const signature = signatureInput.trim() || managerName;
  const tenantName = tenantNameInput.trim() || access.membership.organization.name;
  const learnerName = enrollment.user.name || enrollment.user.email;
  const pdf = certificatePdf(tenantName, learnerName, enrollment.program.name, managerName, signature, Boolean(signatureImageBytes));

  const storage = getStorageAdapter();
  const storageKey = `certificates/${access.membership.organizationId}/${enrollment.userId}-${Date.now()}.pdf`;
  await storage.put(storageKey, pdf, "application/pdf");

  const doc = await prisma.document.create({
    data: {
      userId: enrollment.userId,
      organizationId: access.membership.organizationId,
      type: "CERTIFICATE",
      status: "APPROVED",
      selfCertifiedAt: new Date(),
      versions: {
        create: {
          storageKey,
          mimeType: "application/pdf",
          sizeBytes: pdf.length
        }
      }
    }
  });

  if (signatureImageBytes) {
    const ext = signatureImageMime.includes("jpeg") ? "jpg" : signatureImageMime.includes("svg") ? "svg" : "png";
    const imageKey = `certificates/${access.membership.organizationId}/signatures/${enrollment.userId}-${Date.now()}.${ext}`;
    await storage.put(imageKey, signatureImageBytes, signatureImageMime);
    await prisma.documentVersion.create({
      data: {
        documentId: doc.id,
        storageKey: imageKey,
        mimeType: signatureImageMime,
        sizeBytes: signatureImageBytes.length
      }
    });
  }

  const existingCertificateRecords = await loadOrganizationCertificateRecords(
    access.membership.organizationId,
  );
  const previousRecord = existingCertificateRecords
    .filter((record) => record.enrollmentId === enrollment.id)
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate))[0];
  const issueDate = new Date().toISOString().slice(0, 10);
  const certificateRecord: CertificateRecord = {
    id: previousRecord?.id ?? `cert:${enrollment.id}`,
    documentId: doc.id,
    enrollmentId: enrollment.id,
    userId: enrollment.userId,
    programId: enrollment.programId,
    organizationId: access.membership.organizationId,
    certificateNumber:
      previousRecord?.certificateNumber ??
      buildCertificateNumber(params.orgSlug, enrollment.id, issueDate),
    issueDate,
    releaseRule,
    releaseAt: releaseAtDate.toISOString(),
    status: certificateStatus,
    issuedByUserId: access.user.id,
    signatoryName: signature,
    managerName,
    releasedAt: certificateStatus === "RELEASED" ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString(),
    updatedByUserId: access.user.id,
  };

  const mergedRecords = existingCertificateRecords.filter(
    (record) => record.id !== certificateRecord.id,
  );
  mergedRecords.push(certificateRecord);
  await saveOrganizationCertificateRecords(access.membership.organizationId, mergedRecords);

  await prisma.auditEvent.create({
    data: {
      tenantId: access.membership.organizationId,
      userId: access.user.id,
      action: previousRecord ? "CERTIFICATE_REISSUED" : "CERTIFICATE_ISSUED",
      entityType: "Certificate",
      entityId: certificateRecord.id,
      metadata: {
        documentId: doc.id,
        enrollmentId: enrollment.id,
        certificateNumber: certificateRecord.certificateNumber,
        releaseRule: certificateRecord.releaseRule,
        releaseAt: certificateRecord.releaseAt,
        status: certificateRecord.status,
      },
    },
  });

  if (certificateRecord.status === "RELEASED") {
    await prisma.auditEvent.create({
      data: {
        tenantId: access.membership.organizationId,
        userId: access.user.id,
        action: "CERTIFICATE_RELEASED",
        entityType: "Certificate",
        entityId: certificateRecord.id,
        metadata: {
          enrollmentId: enrollment.id,
          certificateNumber: certificateRecord.certificateNumber,
          releasedAt: certificateRecord.releasedAt,
        },
      },
    });
  }

  const createdFollowUps = await ensureFollowUpSchedulesForCompletedEnrollment({
    organizationId: access.membership.organizationId,
    enrollmentId: enrollment.id,
    userId: enrollment.userId,
    programId: enrollment.programId,
    actorUserId: access.user.id,
  });
  for (const followUp of createdFollowUps) {
    await prisma.auditEvent.create({
      data: {
        tenantId: access.membership.organizationId,
        userId: access.user.id,
        action: "FOLLOW_UP_CREATED",
        entityType: "FollowUp",
        entityId: followUp.id,
        metadata: {
          enrollmentId: followUp.enrollmentId,
          dueMonth: followUp.dueMonth,
          dueDate: followUp.dueDate,
        },
      },
    });
  }

  const wantsJsonResponse = contentType.includes("application/json") || new URL(req.url).searchParams.get("response") === "json";

  if (!wantsJsonResponse) {
    return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/certificates`, req.url));
  }

  return NextResponse.json({
    ok: true,
    documentId: doc.id,
    certificateId: certificateRecord.id,
    certificateNumber: certificateRecord.certificateNumber,
    releaseRule: certificateRecord.releaseRule,
    releaseAt: certificateRecord.releaseAt,
    status: certificateRecord.status,
  });
}
