export const STUDENT_DOCUMENT_TYPES = [
  "ID",
  "CV",
  "QUALIFICATION",
  "CERTIFICATE",
  "PROOF_OF_ADDRESS",
  "BANK_CONFIRMATION",
  "SIGNED_CONSENT",
  "PAYSLIP",
] as const;

export type StudentDocumentType = (typeof STUDENT_DOCUMENT_TYPES)[number];

type RequirementPlan = {
  required: StudentDocumentType[];
  optional: StudentDocumentType[];
};

const PROGRAMME_RULES: Array<{
  matches: RegExp;
  required: StudentDocumentType[];
}> = [
  {
    matches: /programme\s*a|software|tech|developer|ict|engineering/i,
    required: ["ID", "CV", "QUALIFICATION"],
  },
  {
    matches: /programme\s*b|community|service|field/i,
    required: ["ID", "PROOF_OF_ADDRESS"],
  },
  {
    matches: /programme\s*c|finance|bank|admin|operations/i,
    required: ["ID", "BANK_CONFIRMATION", "SIGNED_CONSENT"],
  },
];

const DEFAULT_REQUIRED: StudentDocumentType[] = ["ID", "CV"];

export function resolveProgrammeDocumentPlan(programmeName?: string | null): RequirementPlan {
  const rule =
    PROGRAMME_RULES.find((item) => item.matches.test(programmeName ?? "")) ?? null;
  const required = rule?.required ?? DEFAULT_REQUIRED;
  const optional = STUDENT_DOCUMENT_TYPES.filter((type) => !required.includes(type));
  return { required, optional };
}

export function getDocumentDisplayName(type: StudentDocumentType | string) {
  const map: Record<string, string> = {
    ID: "ID",
    CV: "CV",
    QUALIFICATION: "Qualification",
    CERTIFICATE: "Certificate",
    PROOF_OF_ADDRESS: "Proof of Residence",
    BANK_CONFIRMATION: "Bank Confirmation",
    SIGNED_CONSENT: "Signed Consent Form",
    PAYSLIP: "Payslip",
  };
  return map[type] ?? type;
}
