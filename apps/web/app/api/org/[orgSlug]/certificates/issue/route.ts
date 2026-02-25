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
    ? "BT /F1 11 Tf 84 90 Td (Image signature attached to this certificate record.) Tj ET"
    : `BT /F3 24 Tf 84 78 Td (${safeSignature}) Tj ET`;

  const stream = [
    // certificate parchment background + dual border
    "0.99 0.98 0.94 rg 0 0 842 595 re f",
    "0.84 0.79 0.66 RG 2 w 18 18 806 559 re S",
    "0.45 0.59 0.49 RG 3 w 28 28 786 539 re S",

    // header ribbon lines
    "0.45 0.59 0.49 RG 1.2 w 90 520 m 752 520 l S",
    "0.45 0.59 0.49 RG 1.2 w 90 495 m 752 495 l S",

    // header + title
    "0.17 0.32 0.50 rg",
    `BT /F1 20 Tf 230 505 Td (${safeTenant} PROGRAMME CERTIFICATION) Tj ET`,
    "0.04 0.12 0.29 rg",
    "BT /F2 62 Tf 154 430 Td (Certificate of Completion) Tj ET",

    // centered body copy
    "0.16 0.24 0.38 rg",
    "BT /F1 22 Tf 330 350 Td (This certifies that) Tj ET",
    "0.02 0.48 0.40 rg",
    `BT /F2 58 Tf 176 280 Td (${safeLearner}) Tj ET`,
    "0.16 0.24 0.38 rg",
    "BT /F1 22 Tf 286 218 Td (has successfully completed) Tj ET",
    "0.04 0.12 0.29 rg",
    `BT /F2 48 Tf 244 160 Td (${safeProgramme}) Tj ET`,

    // authorisation block
    "0.20 0.34 0.50 rg",
    "BT /F1 14 Tf 84 132 Td (AUTHORISED BY) Tj ET",
    "0.03 0.12 0.29 rg",
    `BT /F2 18 Tf 84 110 Td (${safeManager}) Tj ET`,
    "0.20 0.34 0.50 rg",
    "BT /F1 12 Tf 84 94 Td (Typed signature:) Tj ET",
    "0.02 0.08 0.20 rg",
    signatureLine,

    // circular stamp with ring
    "1.00 0.95 0.96 rg",
    "770 92 m 770 136.18 734.18 172 690 172 c 645.82 172 610 136.18 610 92 c 610 47.82 645.82 12 690 12 c 734.18 12 770 47.82 770 92 c f",
    "0.86 0.29 0.38 RG 5 w",
    "770 92 m 770 136.18 734.18 172 690 172 c 645.82 172 610 136.18 610 92 c 610 47.82 645.82 12 690 12 c 734.18 12 770 47.82 770 92 c S",
    "0.82 0.08 0.19 rg",
    `BT /F2 14 Tf 648 108 Td (${safeTenant}) Tj ET`,
    "BT /F2 14 Tf 652 82 Td (OFFICIAL) Tj ET",
    "BT /F2 14 Tf 668 56 Td (STAMP) Tj ET",
    "BT /F2 11 Tf 665 30 Td (Verified) Tj ET"
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
