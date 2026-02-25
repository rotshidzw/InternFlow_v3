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

function certificatePdf(tenantName: string, learnerName: string, programmeName: string, managerName: string, signature: string, hasImageSignature: boolean) {
  const safeTenant = escapePdfText(tenantName.toUpperCase());
  const safeLearner = escapePdfText(learnerName);
  const safeProgramme = escapePdfText(programmeName);
  const safeManager = escapePdfText(managerName);
  const safeSignature = escapePdfText(signature);
  const signatureLine = hasImageSignature
    ? "BT /F1 12 Tf 72 100 Td (Image signature attached to this certificate record.) Tj ET"
    : `BT /F3 22 Tf 72 94 Td (${safeSignature}) Tj ET`;

  const stream = [
    // soft certificate background + border
    "0.95 0.97 0.96 rg 8 8 826 579 re f",
    "0.51 0.88 0.74 RG 4 w 8 8 826 579 re S",

    // header + title block
    "0.20 0.34 0.50 rg",
    `BT /F1 16 Tf 250 545 Td (${safeTenant} PROGRAMME CERTIFICATION) Tj ET`,
    "0.03 0.12 0.29 rg",
    "BT /F2 56 Tf 160 470 Td (Certificate of Completion) Tj ET",

    // body center content
    "0.10 0.20 0.34 rg",
    "BT /F1 24 Tf 330 385 Td (This certifies that) Tj ET",
    "0.00 0.48 0.40 rg",
    `BT /F2 52 Tf 220 315 Td (${safeLearner}) Tj ET`,
    "0.10 0.20 0.34 rg",
    "BT /F1 24 Tf 290 255 Td (has successfully completed) Tj ET",
    "0.03 0.12 0.29 rg",
    `BT /F2 40 Tf 300 200 Td (${safeProgramme}) Tj ET`,

    // authorised/signature block
    "0.20 0.34 0.50 rg",
    "BT /F1 14 Tf 72 168 Td (AUTHORISED BY) Tj ET",
    "0.03 0.12 0.29 rg",
    `BT /F2 18 Tf 72 145 Td (${safeManager}) Tj ET`,
    "0.20 0.34 0.50 rg",
    "BT /F1 12 Tf 72 124 Td (Typed signature:) Tj ET",
    "0.02 0.08 0.20 rg",
    signatureLine,

    // circular stamp
    "1.00 0.94 0.95 rg",
    "740 98 m 740 136.66 708.66 168 670 168 c 631.34 168 600 136.66 600 98 c 600 59.34 631.34 28 670 28 c 708.66 28 740 59.34 740 98 c f",
    "0.94 0.58 0.65 RG 5 w",
    "740 98 m 740 136.66 708.66 168 670 168 c 631.34 168 600 136.66 600 98 c 600 59.34 631.34 28 670 28 c 708.66 28 740 59.34 740 98 c S",
    "0.82 0.08 0.19 rg",
    `BT /F2 12 Tf 633 116 Td (${safeTenant}) Tj ET`,
    "BT /F2 12 Tf 636 88 Td (OFFICIAL) Tj ET",
    "BT /F2 12 Tf 650 64 Td (STAMP) Tj ET",
    "BT /F2 10 Tf 647 40 Td (Verified) Tj ET"
  ].join("\n");

  const contentLength = Buffer.byteLength(stream, "utf8");

  const text = [
    "%PDF-1.4",
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    // landscape page to better match certificate card ratio
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
