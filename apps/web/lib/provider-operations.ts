import { prisma } from "@internflow/db/src";
import type { Prisma } from "@prisma/client";

export const PROVIDER_OPS_SETTING_KEYS = {
  STIPEND_RECORDS: "ops_stipend_records_v1",
  COST_CAPTURE_RECORDS: "ops_cost_capture_records_v1",
} as const;

export const REGISTER_TYPES = ["INDUCTION", "MONTHLY_ATTENDANCE"] as const;
export type RegisterType = (typeof REGISTER_TYPES)[number];

export const STIPEND_PAYMENT_STATUSES = [
  "DUE",
  "PAID",
  "HOLD",
  "NOT_ELIGIBLE",
] as const;
export type StipendPaymentStatus = (typeof STIPEND_PAYMENT_STATUSES)[number];

export const COST_CATEGORIES = [
  "FACILITATOR_COSTS",
  "TRANSPORT",
  "PPE",
  "VENUE",
  "CERTIFICATION",
  "STIPEND_TOTALS",
  "ADMIN",
  "OTHER",
] as const;
export type CostCategory = (typeof COST_CATEGORIES)[number];

export const COST_STATUSES = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"] as const;
export type CostStatus = (typeof COST_STATUSES)[number];

export type AttendanceRegisterMetadata = {
  version: 1;
  registerType: RegisterType;
  programmeId: string | null;
  month: string | null;
  attendanceDate: string | null;
  learnerUserId: string | null;
  trainerSignoffBy: string | null;
  trainerSignoffAt: string | null;
  coordinatorApprovalBy: string | null;
  coordinatorApprovalAt: string | null;
  coordinatorApprovalDecision: "APPROVED" | "REJECTED" | null;
  coordinatorApprovalNote: string | null;
  submittedByUserId: string;
  submittedByEmail: string;
  submittedAt: string;
  notes: string | null;
};

export type StipendPaymentRecord = {
  id: string;
  enrollmentId: string;
  userId: string;
  month: string;
  eligible: boolean;
  stipendAmount: number | null;
  paymentStatus: StipendPaymentStatus;
  exceptionReason: string | null;
  payslipDocumentIds: string[];
  proofDocumentIds: string[];
  updatedAt: string;
  updatedByUserId: string;
};

export type CostCaptureRecord = {
  id: string;
  programmeId: string | null;
  month: string;
  category: CostCategory;
  amount: number;
  status: CostStatus;
  evidenceDocumentIds: string[];
  notes: string | null;
  updatedAt: string;
  updatedByUserId: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asNullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return fallback;
}

function asNullableNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeMonth(value: string) {
  const trimmed = value.trim();
  return /^\d{4}-\d{2}$/.test(trimmed) ? trimmed : "";
}

function normalizeRegisterType(value: string): RegisterType {
  return REGISTER_TYPES.includes(value as RegisterType)
    ? (value as RegisterType)
    : "MONTHLY_ATTENDANCE";
}

function normalizePaymentStatus(value: string): StipendPaymentStatus {
  return STIPEND_PAYMENT_STATUSES.includes(value as StipendPaymentStatus)
    ? (value as StipendPaymentStatus)
    : "DUE";
}

function normalizeCostCategory(value: string): CostCategory {
  return COST_CATEGORIES.includes(value as CostCategory)
    ? (value as CostCategory)
    : "OTHER";
}

function normalizeCostStatus(value: string): CostStatus {
  return COST_STATUSES.includes(value as CostStatus)
    ? (value as CostStatus)
    : "DRAFT";
}

function toSettingJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function parseAttendanceRegisterMetadata(
  notes: string | null | undefined,
): AttendanceRegisterMetadata | null {
  if (!notes) return null;
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(notes);
  } catch {
    return null;
  }
  if (!isObject(parsed)) return null;

  const month = normalizeMonth(asString(parsed.month));
  const registerType = normalizeRegisterType(asString(parsed.registerType));

  return {
    version: 1,
    registerType,
    programmeId: asNullableString(parsed.programmeId),
    month: month || null,
    attendanceDate: asNullableString(parsed.attendanceDate),
    learnerUserId: asNullableString(parsed.learnerUserId),
    trainerSignoffBy: asNullableString(parsed.trainerSignoffBy),
    trainerSignoffAt: asNullableString(parsed.trainerSignoffAt),
    coordinatorApprovalBy: asNullableString(parsed.coordinatorApprovalBy),
    coordinatorApprovalAt: asNullableString(parsed.coordinatorApprovalAt),
    coordinatorApprovalDecision:
      parsed.coordinatorApprovalDecision === "APPROVED" ||
      parsed.coordinatorApprovalDecision === "REJECTED"
        ? parsed.coordinatorApprovalDecision
        : null,
    coordinatorApprovalNote: asNullableString(parsed.coordinatorApprovalNote),
    submittedByUserId: asString(parsed.submittedByUserId),
    submittedByEmail: asString(parsed.submittedByEmail),
    submittedAt: asString(parsed.submittedAt),
    notes: asNullableString(parsed.notes),
  };
}

export function serializeAttendanceRegisterMetadata(
  metadata: AttendanceRegisterMetadata,
) {
  return JSON.stringify(metadata);
}

async function readOrganizationSetting(
  organizationId: string,
  key: string,
) {
  return prisma.settings.findFirst({
    where: { organizationId, key },
    select: { id: true, value: true },
  });
}

async function writeOrganizationSetting(
  organizationId: string,
  key: string,
  value: unknown,
) {
  const existing = await readOrganizationSetting(organizationId, key);
  const jsonValue = toSettingJsonValue(value);

  if (existing) {
    await prisma.settings.update({
      where: { id: existing.id },
      data: { value: jsonValue },
    });
    return existing.id;
  }

  const created = await prisma.settings.create({
    data: { organizationId, key, value: jsonValue },
    select: { id: true },
  });
  return created.id;
}

function normalizeStipendRecord(value: unknown): StipendPaymentRecord | null {
  if (!isObject(value)) return null;
  const month = normalizeMonth(asString(value.month));
  const enrollmentId = asString(value.enrollmentId).trim();
  const userId = asString(value.userId).trim();
  const updatedByUserId = asString(value.updatedByUserId).trim();

  if (!month || !enrollmentId || !userId || !updatedByUserId) return null;

  return {
    id: asString(value.id).trim() || `${enrollmentId}:${month}`,
    enrollmentId,
    userId,
    month,
    eligible: asBoolean(value.eligible, true),
    stipendAmount: asNullableNumber(value.stipendAmount),
    paymentStatus: normalizePaymentStatus(asString(value.paymentStatus)),
    exceptionReason: asNullableString(value.exceptionReason),
    payslipDocumentIds: asStringArray(value.payslipDocumentIds),
    proofDocumentIds: asStringArray(value.proofDocumentIds),
    updatedAt: asString(value.updatedAt) || new Date().toISOString(),
    updatedByUserId,
  };
}

function normalizeCostRecord(value: unknown): CostCaptureRecord | null {
  if (!isObject(value)) return null;
  const month = normalizeMonth(asString(value.month));
  const updatedByUserId = asString(value.updatedByUserId).trim();
  if (!month || !updatedByUserId) return null;

  return {
    id: asString(value.id).trim() || `${asString(value.category)}:${month}`,
    programmeId: asNullableString(value.programmeId),
    month,
    category: normalizeCostCategory(asString(value.category)),
    amount: asNullableNumber(value.amount) ?? 0,
    status: normalizeCostStatus(asString(value.status)),
    evidenceDocumentIds: asStringArray(value.evidenceDocumentIds),
    notes: asNullableString(value.notes),
    updatedAt: asString(value.updatedAt) || new Date().toISOString(),
    updatedByUserId,
  };
}

export async function loadOrganizationStipendRecords(organizationId: string) {
  const setting = await readOrganizationSetting(
    organizationId,
    PROVIDER_OPS_SETTING_KEYS.STIPEND_RECORDS,
  );
  if (!setting || !Array.isArray(setting.value)) return [] as StipendPaymentRecord[];

  return setting.value
    .map((item) => normalizeStipendRecord(item))
    .filter((item): item is StipendPaymentRecord => Boolean(item))
    .sort((a, b) => {
      if (a.month === b.month) return b.updatedAt.localeCompare(a.updatedAt);
      return b.month.localeCompare(a.month);
    });
}

export async function saveOrganizationStipendRecords(
  organizationId: string,
  records: StipendPaymentRecord[],
) {
  return writeOrganizationSetting(
    organizationId,
    PROVIDER_OPS_SETTING_KEYS.STIPEND_RECORDS,
    records,
  );
}

export async function loadOrganizationCostCaptureRecords(organizationId: string) {
  const setting = await readOrganizationSetting(
    organizationId,
    PROVIDER_OPS_SETTING_KEYS.COST_CAPTURE_RECORDS,
  );
  if (!setting || !Array.isArray(setting.value)) return [] as CostCaptureRecord[];

  return setting.value
    .map((item) => normalizeCostRecord(item))
    .filter((item): item is CostCaptureRecord => Boolean(item))
    .sort((a, b) => {
      if (a.month === b.month) return b.updatedAt.localeCompare(a.updatedAt);
      return b.month.localeCompare(a.month);
    });
}

export async function saveOrganizationCostCaptureRecords(
  organizationId: string,
  records: CostCaptureRecord[],
) {
  return writeOrganizationSetting(
    organizationId,
    PROVIDER_OPS_SETTING_KEYS.COST_CAPTURE_RECORDS,
    records,
  );
}
