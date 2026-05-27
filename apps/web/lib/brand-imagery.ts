export type BrandImageSpec = {
  src: string;
  alt: string;
};

export const brandImagery = {
  heroOps: {
    src: "/brand/internflow/hero-programme-workflow-operations.png",
    alt: "Programme workflow operations visual linking intake, evidence, and compliance outputs",
  },
  workflowIntelligence: {
    src: "/brand/internflow/operations-intelligence-command-center.png",
    alt: "Operations intelligence command center dashboard with learner, payment, and compliance telemetry",
  },
  complianceEvidence: {
    src: "/brand/internflow/evidence-documents-cloud-vault.png",
    alt: "Evidence and document vault visual with OCR, policy checks, versioning, and audit trail",
  },
  modernTeam: {
    src: "/brand/internflow/facilitator-learner-group-session.png",
    alt: "Facilitator-led learner group session in a professional programme delivery environment",
  },
  studentJourney: {
    src: "/brand/internflow/student-journey-interest-to-impact.png",
    alt: "Student lifecycle progression visual from sign up through placement and active learning",
  },
  providerControlRoom: {
    src: "/brand/internflow/provider-programme-operations-dashboard.png",
    alt: "Provider operations dashboard covering attendance, registers, sessions, and cohort progress",
  },
  trustAndGovernance: {
    src: "/brand/internflow/compliance-audit-readiness-controls.png",
    alt: "Compliance and audit readiness control view showing validation gates and evidence timeline",
  },
  roleBasedOperations: {
    src: "/brand/internflow/unified-role-dashboard-overview.png",
    alt: "Unified platform view showing student, coordinator, provider, finance, facilitator, and auditor perspectives",
  },
  implementationLifecycle: {
    src: "/brand/internflow/lifecycle-platform-overview.png",
    alt: "End-to-end platform lifecycle map across onboarding, payments, certificates, and audit readiness",
  },
  supportAssistant: {
    src: "/brand/internflow/omnichannel-support-assistant.png",
    alt: "Omnichannel support assistant visual connecting chat, email, WhatsApp, and ticket routing",
  },
  financeControls: {
    src: "/brand/internflow/finance-stipend-payroll-workflow.png",
    alt: "Operational stipend and payroll workflow with payment readiness, payslip generation, and proof controls",
  },
  postTrainingOutcomes: {
    src: "/brand/internflow/post-training-outcomes-lifecycle.png",
    alt: "Post-training outcomes visual covering certificate release milestones and long-term impact tracking",
  },
  onboardingCollaboration: {
    src: "/brand/internflow/organization-onboarding-collaboration.png",
    alt: "Organization onboarding collaboration scene with team members aligning setup details",
  },
  mentorshipSupport: {
    src: "/brand/internflow/mentor-learner-guidance-session.png",
    alt: "Mentorship support conversation between learner and facilitator reviewing onboarding documents",
  },
  founderPortrait: {
    src: "/brand/internflow/founder-professional-portrait.png",
    alt: "Founder portrait of Mavhungu Rotshidzwa Chester",
  },
  manualAdminBurden: {
    src: "/brand/internflow/manual-admin-paperwork-burden.png",
    alt: "Manual paperwork overload representing fragmented administrative operations",
  },
} as const satisfies Record<string, BrandImageSpec>;
