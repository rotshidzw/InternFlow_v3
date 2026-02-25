import { z } from "zod";

export const otpRequestSchema = z.object({ email: z.string().email() });
export const orgSetupSchema = z.object({ mode: z.enum(["create", "join"]), orgName: z.string().min(2).optional(), inviteToken: z.string().optional() });
export const documentUploadSchema = z.object({
  userId: z.string().min(1).optional(),
  type: z.enum(["ID", "CV", "CERTIFICATE", "AFFIDAVIT", "PROOF_OF_ADDRESS", "PAYSLIP"]),
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().max(10 * 1024 * 1024),
  selfCertified: z.boolean().default(false)
});
export const logbookEntrySchema = z.object({ weekStart: z.string(), summary: z.string().min(10), evidenceKey: z.string().optional() });
