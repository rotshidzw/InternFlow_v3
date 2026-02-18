import { prisma } from "@internflow/db/src";
import { getStorageAdapter } from "@internflow/shared/src/storage";

const PAYSLIP_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function payslipPdfBuffer(month: string, learnerEmail: string, programName: string) {
  const content = `InternFlow System Payslip\nMonth: ${month}\nLearner: ${learnerEmail}\nProgram: ${programName}\nGenerated at: ${new Date().toISOString()}`;

  const pdf = `%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length ${content.length + 60}>>stream\nBT /F1 12 Tf 50 780 Td (${content.replace(/\n/g, ") Tj T* (")}) Tj ET\nendstream\nendobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000062 00000 n \n0000000119 00000 n \n0000000245 00000 n \n0000000397 00000 n \ntrailer<</Size 6/Root 1 0 R>>\nstartxref\n472\n%%EOF`;

  return Buffer.from(pdf);
}

export async function ensureSystemPayslipForEnrollment(enrollmentId: string, month: string) {
  if (!PAYSLIP_MONTH_PATTERN.test(month)) return false;

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { user: true, program: true }
  });

  if (!enrollment) return false;

  const monthKey = `/payslip-${month}.pdf`;
  const existing = await prisma.document.findFirst({
    where: {
      userId: enrollment.userId,
      organizationId: enrollment.organizationId,
      type: "PAYSLIP",
      versions: { some: { storageKey: { contains: monthKey } } }
    },
    select: { id: true }
  });

  if (existing) return false;

  const storageKey = `system/payslips/${enrollment.organizationId}/${enrollment.userId}/${Date.now()}-payslip-${month}.pdf`;
  const pdfBytes = payslipPdfBuffer(month, enrollment.user.email, enrollment.program.name);
  await getStorageAdapter().put(storageKey, pdfBytes, "application/pdf");

  await prisma.document.create({
    data: {
      userId: enrollment.userId,
      organizationId: enrollment.organizationId,
      type: "PAYSLIP",
      status: "SCAN_OK",
      selfCertifiedAt: new Date(),
      expirationDate: new Date(new Date(month + "-01T00:00:00.000Z").getTime() + 45 * 24 * 60 * 60 * 1000),
      versions: {
        create: {
          storageKey,
          mimeType: "application/pdf",
          sizeBytes: pdfBytes.byteLength
        }
      }
    }
  });

  return true;
}
