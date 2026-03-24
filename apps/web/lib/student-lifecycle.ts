type LifecycleInput = {
  hasInvite?: boolean;
  hasUser: boolean;
  hasProfileCore: boolean;
  docs: Array<{ status: string }>;
  latestApplicationStatus?: string | null;
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

export function deriveStudentLifecycle(input: LifecycleInput): StudentLifecycle {
  const accountStatus: StudentLifecycle["accountStatus"] = !input.hasUser
    ? "invited"
    : input.enrollmentStatus === "ACTIVE"
      ? "active"
      : "registered";

  const profileStatus: StudentLifecycle["profileStatus"] = input.hasProfileCore
    ? "complete"
    : "incomplete";

  const docCount = input.docs.length;
  const hasRejected = input.docs.some((d) => ["REJECTED", "SCAN_FAILED"].includes(d.status));
  const hasVerified = input.docs.some((d) => d.status === "APPROVED");
  const hasProcessing = input.docs.some((d) => ["SCAN_PENDING", "SCAN_OK"].includes(d.status));
  const hasSubmitted = input.docs.some((d) => d.status === "SUBMITTED");
  const documentStatus: StudentLifecycle["documentStatus"] = docCount === 0
    ? "missing"
    : hasRejected
      ? "rejected"
      : hasProcessing
        ? "processing"
        : hasVerified
          ? "verified"
          : hasSubmitted
            ? "submitted"
            : "partial";

  const app = (input.latestApplicationStatus ?? "").toUpperCase();
  const applicationStatus: StudentLifecycle["applicationStatus"] = !app
    ? "not_started"
    : ["DRAFT"].includes(app)
      ? "draft"
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
