type LifecycleInput = {
  hasInvite?: boolean;
  hasUser: boolean;
  hasProfileCore: boolean;
  docs: Array<{ status: string; type?: string }>;
  requiredDocumentTypes?: readonly string[];
  latestApplicationStatus?: string | null;
  latestApplicationSubmittedAt?: Date | string | null;
  enrollmentStatus?: string | null;
};

export type StudentLifecycle = {
  accountStatus: "invited" | "registered" | "active" | "suspended";
  profileStatus: "incomplete" | "complete";
  documentStatus: "missing" | "partial" | "submitted" | "processing" | "verified" | "rejected";
  applicationStatus: "not_started" | "draft" | "submitted" | "under_review" | "accepted" | "rejected";
  placementStatus: "unassigned" | "shortlisted" | "assigned" | "active" | "completed";
  programmeStatus: "not_enrolled" | "enrolled" | "in_progress" | "completed";
};

function resolveDocumentStatus(
  docs: Array<{ status: string; type?: string }>,
  requiredDocumentTypes: readonly string[] = [],
): StudentLifecycle["documentStatus"] {
  if (requiredDocumentTypes.length > 0) {
    const latestByType = new Map<string, string>();
    for (const doc of docs) {
      if (!doc.type || latestByType.has(doc.type)) continue;
      latestByType.set(doc.type, doc.status);
    }

    const requiredStatuses = requiredDocumentTypes.map((type) => latestByType.get(type) ?? null);
    const uploadedRequired = requiredStatuses.filter(Boolean).length;
    const hasMissingRequired = uploadedRequired < requiredDocumentTypes.length;
    const hasRejected = requiredStatuses.some(
      (status) => status === "REJECTED" || status === "SCAN_FAILED",
    );
    const hasProcessing = requiredStatuses.some(
      (status) => status === "SCAN_PENDING" || status === "SCAN_OK",
    );
    const hasSubmitted = requiredStatuses.some((status) => status === "SUBMITTED");
    const allApproved =
      requiredStatuses.length > 0 &&
      requiredStatuses.every((status) => status === "APPROVED");

    if (uploadedRequired === 0) return "missing";
    if (hasRejected) return "rejected";
    if (hasProcessing) return "processing";
    if (allApproved) return "verified";
    if (hasMissingRequired) return "partial";
    if (hasSubmitted) return "submitted";
    return "partial";
  }

  const docCount = docs.length;
  const hasRejected = docs.some((d) => ["REJECTED", "SCAN_FAILED"].includes(d.status));
  const hasVerified = docs.some((d) => d.status === "APPROVED");
  const hasProcessing = docs.some((d) => ["SCAN_PENDING", "SCAN_OK"].includes(d.status));
  const hasSubmitted = docs.some((d) => d.status === "SUBMITTED");
  if (docCount === 0) return "missing";
  if (hasRejected) return "rejected";
  if (hasProcessing) return "processing";
  if (hasVerified) return "verified";
  if (hasSubmitted) return "submitted";
  return "partial";
}

export function deriveStudentLifecycle(input: LifecycleInput): StudentLifecycle {
  const accountStatus: StudentLifecycle["accountStatus"] = !input.hasUser
    ? "invited"
    : input.enrollmentStatus === "ACTIVE"
      ? "active"
      : "registered";

  const profileStatus: StudentLifecycle["profileStatus"] = input.hasProfileCore
    ? "complete"
    : "incomplete";

  const documentStatus = resolveDocumentStatus(
    input.docs,
    input.requiredDocumentTypes ?? [],
  );

  const app = (input.latestApplicationStatus ?? "").toUpperCase();
  const hasSubmittedAt = Boolean(input.latestApplicationSubmittedAt);
  const applicationStatus: StudentLifecycle["applicationStatus"] = !app
    ? "not_started"
    : app === "DRAFT" && !hasSubmittedAt
      ? "draft"
      : app === "DRAFT" && hasSubmittedAt
        ? "submitted"
        : ["APPLIED", "SUBMITTED"].includes(app)
        ? "submitted"
        : ["REVIEW", "SHORTLISTED"].includes(app)
          ? "under_review"
          : app === "ACCEPTED"
            ? "accepted"
            : app === "REJECTED"
              ? "rejected"
              : "draft";

  const enrollment = (input.enrollmentStatus ?? "").toUpperCase();
  const placementStatus: StudentLifecycle["placementStatus"] = enrollment === "ACTIVE"
    ? "active"
    : enrollment === "COMPLETED"
      ? "completed"
      : enrollment === "PENDING"
        ? "assigned"
        : applicationStatus === "under_review"
          ? "shortlisted"
          : "unassigned";

  const programmeStatus: StudentLifecycle["programmeStatus"] = enrollment === "ACTIVE"
    ? "in_progress"
    : enrollment === "COMPLETED"
      ? "completed"
      : enrollment === "PENDING"
        ? "enrolled"
        : "not_enrolled";

  return {
    accountStatus,
    profileStatus,
    documentStatus,
    applicationStatus,
    placementStatus,
    programmeStatus,
  };
}
