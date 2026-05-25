import { prisma } from "@internflow/db/src";
import type { Prisma } from "@prisma/client";

export const PROVIDER_OPS_SETTING_KEYS = {
  STIPEND_RECORDS: "ops_stipend_records_v1",
  COST_CAPTURE_RECORDS: "ops_cost_capture_records_v1",
  CERTIFICATE_POLICY_RECORDS: "ops_certificate_policy_records_v1",
  CERTIFICATE_RECORDS: "ops_certificate_records_v1",
  FOLLOW_UP_RECORDS: "ops_follow_up_records_v1",
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

export const CERTIFICATE_RELEASE_RULES = [
  "IMMEDIATE",
  "AFTER_3_MONTHS",
  "AFTER_6_MONTHS",
  "AFTER_12_MONTHS",
] as const;
export type CertificateReleaseRule = (typeof CERTIFICATE_RELEASE_RULES)[number];

export const CERTIFICATE_STATUSES = ["ISSUED", "RELEASED", "REVOKED"] as const;
export type CertificateStatus = (typeof CERTIFICATE_STATUSES)[number];

export const FOLLOW_UP_MONTHS = [3, 6, 12] as const;
export type FollowUpMonth = (typeof FOLLOW_UP_MONTHS)[number];

export const FOLLOW_UP_OUTCOMES = [
  "EMPLOYED",
  "SELF_EMPLOYED",
  "PLACEMENT_CONTINUED",
  "FURTHER_STUDY",
  "BUSINESS_STARTED",
  "STILL_SEEKING",
  "NO_OUTCOME_YET",
] as const;
export type FollowUpOutcome = (typeof FOLLOW_UP_OUTCOMES)[number];

export const FOLLOW_UP_STATUSES = ["DUE", "COMPLETED", "SKIPPED"] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

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

export type CertificatePolicyRecord = {
  id: string;
  programId: string | null;
  releaseRule: CertificateReleaseRule;
  updatedAt: string;
  updatedByUserId: string;
};

export type CertificateRecord = {
  id: string;
  documentId: string | null;
  enrollmentId: string;
  userId: string;
  programId: string;
  organizationId: string;
  certificateNumber: string;
  issueDate: string;
  releaseRule: CertificateReleaseRule;
  releaseAt: string;
  status: CertificateStatus;
  issuedByUserId: string;
  signatoryName: string | null;
  managerName: string | null;
  releasedAt: string | null;
  updatedAt: string;
  updatedByUserId: string;
};

export type FollowUpRecord = {
  id: string;
  enrollmentId: string;
  userId: string;
  programId: string;
  organizationId: string;
  dueMonth: FollowUpMonth;
  dueDate: string;
  status: FollowUpStatus;
  outcome: FollowUpOutcome | null;
  outcomeNotes: string | null;
  evidenceDocumentIds: string[];
  completedAt: string | null;
  completedByUserId: string | null;
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

function normalizeCertificateReleaseRule(value: string): CertificateReleaseRule {
  return CERTIFICATE_RELEASE_RULES.includes(value as CertificateReleaseRule)
    ? (value as CertificateReleaseRule)
    : "IMMEDIATE";
}

function normalizeCertificateStatus(value: string): CertificateStatus {
  return CERTIFICATE_STATUSES.includes(value as CertificateStatus)
    ? (value as CertificateStatus)
    : "ISSUED";
}

function normalizeFollowUpMonth(value: unknown): FollowUpMonth | null {
  const parsed = Number(value);
  if (FOLLOW_UP_MONTHS.includes(parsed as FollowUpMonth)) {
    return parsed as FollowUpMonth;
  }
  return null;
}

function normalizeFollowUpStatus(value: string): FollowUpStatus {
  return FOLLOW_UP_STATUSES.includes(value as FollowUpStatus)
    ? (value as FollowUpStatus)
    : "DUE";
}

function normalizeFollowUpOutcome(value: string): FollowUpOutcome | null {
  if (!value) return null;
  return FOLLOW_UP_OUTCOMES.includes(value as FollowUpOutcome)
    ? (value as FollowUpOutcome)
    : null;
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

function normalizeCertificatePolicyRecord(value: unknown): CertificatePolicyRecord | null {
  if (!isObject(value)) return null;
  const id = asString(value.id).trim();
  const updatedByUserId = asString(value.updatedByUserId).trim();
  if (!id || !updatedByUserId) return null;

  return {
    id,
    programId: asNullableString(value.programId),
    releaseRule: normalizeCertificateReleaseRule(asString(value.releaseRule)),
    updatedAt: asString(value.updatedAt) || new Date().toISOString(),
    updatedByUserId,
  };
}

function normalizeCertificateRecord(value: unknown): CertificateRecord | null {
  if (!isObject(value)) return null;
  const id = asString(value.id).trim();
  const enrollmentId = asString(value.enrollmentId).trim();
  const userId = asString(value.userId).trim();
  const programId = asString(value.programId).trim();
  const organizationId = asString(value.organizationId).trim();
  const certificateNumber = asString(value.certificateNumber).trim();
  const issueDate = asString(value.issueDate).trim();
  const releaseAt = asString(value.releaseAt).trim();
  const issuedByUserId = asString(value.issuedByUserId).trim();
  const updatedAt = asString(value.updatedAt).trim();
  const updatedByUserId =
    asString(value.updatedByUserId).trim() || issuedByUserId;

  if (
    !id ||
    !enrollmentId ||
    !userId ||
    !programId ||
    !organizationId ||
    !certificateNumber ||
    !issueDate ||
    !releaseAt ||
    !issuedByUserId
  ) {
    return null;
  }

  return {
    id,
    documentId: asNullableString(value.documentId),
    enrollmentId,
    userId,
    programId,
    organizationId,
    certificateNumber,
    issueDate,
    releaseRule: normalizeCertificateReleaseRule(asString(value.releaseRule)),
    releaseAt,
    status: normalizeCertificateStatus(asString(value.status)),
    issuedByUserId,
    signatoryName: asNullableString(value.signatoryName),
    managerName: asNullableString(value.managerName),
    releasedAt: asNullableString(value.releasedAt),
    updatedAt: updatedAt || new Date().toISOString(),
    updatedByUserId,
  };
}

function normalizeFollowUpRecord(value: unknown): FollowUpRecord | null {
  if (!isObject(value)) return null;
  const id = asString(value.id).trim();
  const enrollmentId = asString(value.enrollmentId).trim();
  const userId = asString(value.userId).trim();
  const programId = asString(value.programId).trim();
  const organizationId = asString(value.organizationId).trim();
  const dueDate = asString(value.dueDate).trim();
  const updatedByUserId = asString(value.updatedByUserId).trim();
  const dueMonth = normalizeFollowUpMonth(value.dueMonth);

  if (
    !id ||
    !enrollmentId ||
    !userId ||
    !programId ||
    !organizationId ||
    !dueDate ||
    !updatedByUserId ||
    !dueMonth
  ) {
    return null;
  }

  return {
    id,
    enrollmentId,
    userId,
    programId,
    organizationId,
    dueMonth,
    dueDate,
    status: normalizeFollowUpStatus(asString(value.status)),
    outcome: normalizeFollowUpOutcome(asString(value.outcome)),
    outcomeNotes: asNullableString(value.outcomeNotes),
    evidenceDocumentIds: asStringArray(value.evidenceDocumentIds),
    completedAt: asNullableString(value.completedAt),
    completedByUserId: asNullableString(value.completedByUserId),
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

export function certificateReleaseMonths(rule: CertificateReleaseRule) {
  if (rule === "AFTER_3_MONTHS") return 3;
  if (rule === "AFTER_6_MONTHS") return 6;
  if (rule === "AFTER_12_MONTHS") return 12;
  return 0;
}

export function addMonths(dateInput: Date | string, months: number) {
  const base = typeof dateInput === "string" ? new Date(dateInput) : new Date(dateInput);
  const result = new Date(base);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

export function resolveCertificateReleaseAt(
  completionDate: Date | string,
  releaseRule: CertificateReleaseRule,
) {
  const months = certificateReleaseMonths(releaseRule);
  return addMonths(completionDate, months);
}

export function isReleaseDue(releaseAt: Date | string, now = new Date()) {
  const releaseDate = typeof releaseAt === "string" ? new Date(releaseAt) : releaseAt;
  return releaseDate.getTime() <= now.getTime();
}

export async function loadOrganizationCertificatePolicyRecords(organizationId: string) {
  const setting = await readOrganizationSetting(
    organizationId,
    PROVIDER_OPS_SETTING_KEYS.CERTIFICATE_POLICY_RECORDS,
  );
  if (!setting || !Array.isArray(setting.value)) return [] as CertificatePolicyRecord[];

  return setting.value
    .map((item) => normalizeCertificatePolicyRecord(item))
    .filter((item): item is CertificatePolicyRecord => Boolean(item))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveOrganizationCertificatePolicyRecords(
  organizationId: string,
  records: CertificatePolicyRecord[],
) {
  return writeOrganizationSetting(
    organizationId,
    PROVIDER_OPS_SETTING_KEYS.CERTIFICATE_POLICY_RECORDS,
    records,
  );
}

export function resolveCertificateReleaseRuleForProgram(
  programId: string,
  policyRecords: CertificatePolicyRecord[],
) {
  const specific = policyRecords.find((record) => record.programId === programId);
  if (specific) return specific.releaseRule;
  const orgDefault = policyRecords.find((record) => record.programId === null);
  return orgDefault?.releaseRule ?? "IMMEDIATE";
}

export async function loadOrganizationCertificateRecords(organizationId: string) {
  const setting = await readOrganizationSetting(
    organizationId,
    PROVIDER_OPS_SETTING_KEYS.CERTIFICATE_RECORDS,
  );
  if (!setting || !Array.isArray(setting.value)) return [] as CertificateRecord[];

  return setting.value
    .map((item) => normalizeCertificateRecord(item))
    .filter((item): item is CertificateRecord => Boolean(item))
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate));
}

export async function saveOrganizationCertificateRecords(
  organizationId: string,
  records: CertificateRecord[],
) {
  return writeOrganizationSetting(
    organizationId,
    PROVIDER_OPS_SETTING_KEYS.CERTIFICATE_RECORDS,
    records,
  );
}

export async function loadOrganizationFollowUpRecords(organizationId: string) {
  const setting = await readOrganizationSetting(
    organizationId,
    PROVIDER_OPS_SETTING_KEYS.FOLLOW_UP_RECORDS,
  );
  if (!setting || !Array.isArray(setting.value)) return [] as FollowUpRecord[];

  return setting.value
    .map((item) => normalizeFollowUpRecord(item))
    .filter((item): item is FollowUpRecord => Boolean(item))
    .sort((a, b) => {
      if (a.dueDate === b.dueDate) return b.updatedAt.localeCompare(a.updatedAt);
      return a.dueDate.localeCompare(b.dueDate);
    });
}

export async function saveOrganizationFollowUpRecords(
  organizationId: string,
  records: FollowUpRecord[],
) {
  return writeOrganizationSetting(
    organizationId,
    PROVIDER_OPS_SETTING_KEYS.FOLLOW_UP_RECORDS,
    records,
  );
}

export async function resolveEnrollmentCompletionDate(enrollmentId: string) {
  const events = await prisma.auditEvent.findMany({
    where: {
      entityType: "Enrollment",
      entityId: enrollmentId,
      action: "ENROLLMENT_STATUS_UPDATED",
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  for (const event of events) {
    const metadata = (event.metadata ?? {}) as Record<string, unknown>;
    if (String(metadata.nextStatus ?? "").toUpperCase() === "COMPLETED") {
      return event.createdAt;
    }
  }
  return null;
}

export async function ensureFollowUpSchedulesForCompletedEnrollment(args: {
  organizationId: string;
  enrollmentId: string;
  userId: string;
  programId: string;
  actorUserId: string;
}) {
  const existing = await loadOrganizationFollowUpRecords(args.organizationId);
  const completionDate =
    (await resolveEnrollmentCompletionDate(args.enrollmentId)) ?? new Date();
  const created: FollowUpRecord[] = [];
  let records = [...existing];

  for (const month of FOLLOW_UP_MONTHS) {
    const id = `${args.enrollmentId}:${month}m`;
    if (records.some((record) => record.id === id)) continue;

    const dueDate = addMonths(completionDate, month).toISOString();
    const followUp: FollowUpRecord = {
      id,
      enrollmentId: args.enrollmentId,
      userId: args.userId,
      programId: args.programId,
      organizationId: args.organizationId,
      dueMonth: month,
      dueDate,
      status: "DUE",
      outcome: null,
      outcomeNotes: null,
      evidenceDocumentIds: [],
      completedAt: null,
      completedByUserId: null,
      updatedAt: new Date().toISOString(),
      updatedByUserId: args.actorUserId,
    };
    records.push(followUp);
    created.push(followUp);
  }

  if (created.length > 0) {
    await saveOrganizationFollowUpRecords(args.organizationId, records);
  }

  return created;
}

export async function applyCertificateReleaseTransitions(args: {
  organizationId: string;
  actorUserId: string;
}) {
  const now = new Date();
  const records = await loadOrganizationCertificateRecords(args.organizationId);
  const transitioned: CertificateRecord[] = [];
  let changed = false;

  const updated = records.map((record) => {
    if (record.status !== "ISSUED") return record;
    if (!isReleaseDue(record.releaseAt, now)) return record;

    changed = true;
    const next: CertificateRecord = {
      ...record,
      status: "RELEASED",
      releasedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      updatedByUserId: args.actorUserId,
    };
    transitioned.push(next);
    return next;
  });

  if (changed) {
    await saveOrganizationCertificateRecords(args.organizationId, updated);
  }

  return { updated, transitioned };
}

export async function applyCertificateReleaseTransitionsWithAudit(args: {
  organizationId: string;
  actorUserId: string;
}) {
  const result = await applyCertificateReleaseTransitions(args);

  for (const released of result.transitioned) {
    await prisma.auditEvent.create({
      data: {
        tenantId: args.organizationId,
        userId: args.actorUserId,
        action: "CERTIFICATE_RELEASE_ELIGIBILITY_REACHED",
        entityType: "Certificate",
        entityId: released.id,
        metadata: {
          enrollmentId: released.enrollmentId,
          certificateNumber: released.certificateNumber,
          releaseAt: released.releaseAt,
        },
      },
    });

    await prisma.auditEvent.create({
      data: {
        tenantId: args.organizationId,
        userId: args.actorUserId,
        action: "CERTIFICATE_RELEASED",
        entityType: "Certificate",
        entityId: released.id,
        metadata: {
          enrollmentId: released.enrollmentId,
          certificateNumber: released.certificateNumber,
          releasedAt: released.releasedAt,
          releaseRule: released.releaseRule,
        },
      },
    });
  }

  return result;
}
