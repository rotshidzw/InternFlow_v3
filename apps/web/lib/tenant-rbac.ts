import { redirect } from "next/navigation";

const ACCESS_BY_AREA: Record<string, string[]> = {
  dashboard: ["PROVIDER_ADMIN", "COORDINATOR", "SUPERVISOR"],
  programs: ["PROVIDER_ADMIN", "COORDINATOR"],
  templates: ["PROVIDER_ADMIN", "COORDINATOR"],
  opportunities: ["PROVIDER_ADMIN", "COORDINATOR"],
  applicants: ["PROVIDER_ADMIN", "COORDINATOR"],
  enrollments: ["PROVIDER_ADMIN", "COORDINATOR", "SUPERVISOR"],
  documents: ["PROVIDER_ADMIN", "COORDINATOR", "SUPERVISOR"],
  logbooks: ["PROVIDER_ADMIN", "COORDINATOR", "SUPERVISOR"],
  approvals: ["PROVIDER_ADMIN", "COORDINATOR"],
  reports: ["PROVIDER_ADMIN", "COORDINATOR", "SUPERVISOR"],
  stipends: ["PROVIDER_ADMIN", "COORDINATOR"],
  staff: ["PROVIDER_ADMIN", "COORDINATOR"],
  settings: ["PROVIDER_ADMIN", "COORDINATOR", "SUPERVISOR"],
  learners: ["PROVIDER_ADMIN", "COORDINATOR", "SUPERVISOR"]
};

export function assertTenantAreaAccess(orgSlug: string, role: string, area: keyof typeof ACCESS_BY_AREA) {
  const allowed = ACCESS_BY_AREA[area];
  if (!allowed.includes(role)) redirect(`/org/${orgSlug}/app/dashboard?error=forbidden`);
}
