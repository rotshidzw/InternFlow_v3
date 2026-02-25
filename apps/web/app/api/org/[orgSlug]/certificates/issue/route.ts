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

function centerTextX(text: string, fontSize: number, weight = 0.52) {
  const pageWidth = 842;
  const estimatedWidth = text.length * fontSize * weight;
  return Math.max(48, Math.round((pageWidth - estimatedWidth) / 2));
}

function certificatePdf(tenantName: string, learnerName: string, programmeName: string, managerName: string, signature: string, hasImageSignature: boolean) {
  const safeTenant = escapePdfText(tenantName.toUpperCase());
  const safeLearner = escapePdfText(learnerName);
  const safeProgramme = escapePdfText(programmeName);
  const safeManager = escapePdfText(managerName);
  const safeSignature = escapePdfText(signature);

  const headerText = `${safeTenant} PROGRAMME CERTIFICATION`;
  const titleText = "Certificate of Completion";
  const lineOneText = "This certifies that";
  const lineTwoText = "has successfully completed";

  const signatureLine = hasImageSignature
    ? "BT /F1 11 Tf 96 92 Td (Image signature attached to this certificate record.) Tj ET"
    : `BT /F3 24 Tf 96 74 Td (${safeSignature}) Tj ET`;

  const stream = [
    // certificate background (restored to previous soft certificate tone)
    "0.95 0.97 0.96 rg 0 0 842 595 re f",

    // double border
    "0.83 0.77 0.65 RG 2 w 18 18 806 559 re S",
    "0.45 0.62 0.55 RG 3 w 30 30 782 535 re S",

    // header separators
    "0.45 0.62 0.55 RG 1.1 w 86 526 m 756 526 l S",
    "0.45 0.62 0.55 RG 1.1 w 86 500 m 756 500 l S",

    // heading/title
    "0.17 0.32 0.50 rg",
    `BT /F1 19 Tf ${centerTextX(headerText, 19, 0.50)} 510 Td (${headerText}) Tj ET`,
    "0.04 0.12 0.29 rg",
    `BT /F2 72 Tf ${centerTextX(titleText, 72, 0.48)} 430 Td (${titleText}) Tj ET`,

    // learner/programme body
    "0.16 0.24 0.38 rg",
    `BT /F1 22 Tf ${centerTextX(lineOneText, 22, 0.50)} 338 Td (${lineOneText}) Tj ET`,
    "0.02 0.48 0.40 rg",
    `BT /F2 58 Tf ${centerTextX(safeLearner, 58, 0.47)} 266 Td (${safeLearner}) Tj ET`,
    "0.16 0.24 0.38 rg",
    `BT /F1 22 Tf ${centerTextX(lineTwoText, 22, 0.50)} 204 Td (${lineTwoText}) Tj ET`,
    "0.04 0.12 0.29 rg",
    `BT /F2 58 Tf ${centerTextX(safeProgramme, 58, 0.47)} 132 Td (${safeProgramme}) Tj ET`,

    // authorisation block
    "0.20 0.34 0.50 rg",
    "BT /F1 14 Tf 96 136 Td (AUTHORISED BY) Tj ET",
    "0.03 0.12 0.29 rg",
    `BT /F2 18 Tf 96 112 Td (${safeManager}) Tj ET`,
    "0.20 0.34 0.50 rg",
    "BT /F1 12 Tf 96 96 Td (Typed signature:) Tj ET",
    "0.02 0.08 0.20 rg",
    signatureLine,

    // circular stamp aligned bottom-right with inner ring
    "1.00 0.95 0.96 rg",
    "760 96 m 760 143.50 721.50 182 674 182 c 626.50 182 588 143.50 588 96 c 588 48.50 626.50 10 674 10 c 721.50 10 760 48.50 760 96 c f",
    "0.86 0.29 0.38 RG 5 w",
    "760 96 m 760 143.50 721.50 182 674 182 c 626.50 182 588 143.50 588 96 c 588 48.50 626.50 10 674 10 c 721.50 10 760 48.50 760 96 c S",
    "0.86 0.29 0.38 RG 1.2 w",
    "748 96 m 748 136.87 714.87 170 674 170 c 633.13 170 600 136.87 600 96 c 600 55.13 633.13 22 674 22 c 714.87 22 748 55.13 748 96 c S",
    "0.82 0.08 0.19 rg",
    `BT /F2 14 Tf ${centerTextX(safeTenant, 14, 0.53) + 282} 110 Td (${safeTenant}) Tj ET`,
    "BT /F2 14 Tf 635 82 Td (OFFICIAL) Tj ET",
    "BT /F2 14 Tf 650 56 Td (STAMP) Tj ET",
    "BT /F2 11 Tf 646 30 Td (Verified) Tj ET"
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
