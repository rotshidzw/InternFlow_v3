import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { getOrgAccess } from "@/lib/org-access";
import { getStorageAdapter } from "@internflow/shared/src/storage";

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

function fitFontSize(text: string, maxSize: number, minSize: number, maxWidth: number, weight = 0.52) {
  let size = maxSize;
  while (size > minSize && text.length * size * weight > maxWidth) size -= 1;
  return size;
}

function certificatePdf(tenantName: string, learnerName: string, programmeName: string, managerName: string, signature: string, hasImageSignature: boolean) {
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
  const titleSize = fitFontSize(titleText, 52, 42, 720, 0.5);
  const learnerSize = fitFontSize(safeLearner, 48, 30, 700, 0.5);
  const programmeSize = fitFontSize(safeProgramme, 32, 24, 640, 0.5);
  const tenantStampSize = fitFontSize(safeTenant, 12, 9, 102, 0.53);

  const signatureLine = hasImageSignature
    ? "BT /F1 10 Tf 98 64 Td (Signed via uploaded image signature.) Tj ET"
    : `BT /F3 18 Tf 98 54 Td (${safeSignature}) Tj ET`;

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
    `BT /F1 10 Tf ${centerTextX(`Completed on ${issueDate}`, 10, 0.5)} 122 Td (Completed on ${issueDate}) Tj ET`,

    // zone 3: left signature block
    "0.20 0.34 0.50 rg",
    "BT /F1 13 Tf 98 130 Td (AUTHORISED BY) Tj ET",
    "0.03 0.12 0.29 rg",
    `BT /F2 16 Tf 98 110 Td (${safeManager}) Tj ET`,
    "0.30 0.35 0.40 rg",
    "BT /F1 11 Tf 98 92 Td (Programme Coordinator) Tj ET",
    "BT /F1 11 Tf 98 78 Td (Signed digitally) Tj ET",
    "0.16 0.20 0.28 RG 0.8 w 98 74 m 270 74 l S",
    "0.02 0.08 0.20 rg",
    signatureLine,

    // zone 3: right circular stamp
    "1.00 0.95 0.96 rg",
    "746 130 m 746 169.76 713.76 202 674 202 c 634.24 202 602 169.76 602 130 c 602 90.24 634.24 58 674 58 c 713.76 58 746 90.24 746 130 c f",
    "0.86 0.29 0.38 RG 4 w",
    "746 130 m 746 169.76 713.76 202 674 202 c 634.24 202 602 169.76 602 130 c 602 90.24 634.24 58 674 58 c 713.76 58 746 90.24 746 130 c S",
    "0.86 0.29 0.38 RG 1 w",
    "736 130 m 736 164.23 708.23 192 674 192 c 639.77 192 612 164.23 612 130 c 612 95.77 639.77 68 674 68 c 708.23 68 736 95.77 736 130 c S",
    "0.82 0.08 0.19 rg",
    `BT /F2 ${tenantStampSize} Tf ${centerTextX(safeTenant, tenantStampSize, 0.53) + 287} 144 Td (${safeTenant}) Tj ET`,
    "BT /F2 13 Tf 637 122 Td (OFFICIAL) Tj ET",
    "BT /F2 13 Tf 652 100 Td (STAMP) Tj ET",
    "BT /F2 10 Tf 648 80 Td (Verified) Tj ET",

    // footer divider + metadata
    "0.18 0.44 0.34 RG 0.9 w 86 34 m 756 34 l S",
    "0.35 0.40 0.45 rg",
    "BT /F1 9 Tf 96 14 Td (Certificate ID: IF-ISSUED) Tj ET",
    "BT /F1 9 Tf 376 14 Td (INTERNFLOW) Tj ET",
    `BT /F1 9 Tf 664 14 Td (Issue Date: ${issueDate}) Tj ET`
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

  const url = new URL(req.url);
  const programId = (url.searchParams.get("programId") ?? "").trim();

  const enrollments = await prisma.enrollment.findMany({
    where: {
      organizationId: access.membership.organizationId,
      status: "COMPLETED",
      ...(programId ? { programId } : {})
    },
    include: { user: true, program: true },
    take: 500
  });

  if (enrollments.length === 0) {
    return NextResponse.json({ error: "No completed enrollments found for bulk certificate download." }, { status: 404 });
  }

  const managerName = access.user.name || "Programme Manager";
  const tenantName = access.membership.organization.name;

  const entries = enrollments.map((enrollment) => {
    const learnerName = enrollment.user.name || enrollment.user.email;
    const pdf = certificatePdf(tenantName, learnerName, enrollment.program.name, managerName, "Signed digitally", false);
    const programFolder = sanitizeFileName(enrollment.program.name || "Programme");
    const learnerFile = sanitizeFileName(`${learnerName}-certificate.pdf`);
    return { name: `${programFolder}/${learnerFile}`, data: pdf };
  });

  const zip = createZipBuffer(entries);
  const filename = sanitizeFileName(`${tenantName}-${programId ? "programme" : "all"}-certificates.zip`);

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

  const managerName = managerNameInput.trim() || access.user.name || "Programme Manager";
  const signature = signatureInput.trim() || "Signed digitally";
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

  const wantsJsonResponse = contentType.includes("application/json") || new URL(req.url).searchParams.get("response") === "json";

  if (!wantsJsonResponse) {
    return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/certificates`, req.url));
  }

  return NextResponse.json({ ok: true, documentId: doc.id });
}
