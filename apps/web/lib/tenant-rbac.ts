import { redirect } from "next/navigation";

const ROLE_HOME: Record<string, (orgSlug: string) => string> = {
  PROVIDER_ADMIN: (orgSlug) => `/org/${orgSlug}/provider-admin`,
  COORDINATOR: (orgSlug) => `/org/${orgSlug}/coordinator`,
  SUPERVISOR: (orgSlug) => `/org/${orgSlug}/supervisor`,
  STUDENT: () => `/app/student`
};

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

export function tenantRoleHome(orgSlug: string, role: string) {
  return ROLE_HOME[role]?.(orgSlug) ?? `/workspaces`;
}

export function assertTenantAreaAccess(orgSlug: string, role: string, area: keyof typeof ACCESS_BY_AREA) {
  const allowed = ACCESS_BY_AREA[area];
  if (!allowed.includes(role)) {
    const fallback = tenantRoleHome(orgSlug, role);
    const joiner = fallback.includes("?") ? "&" : "?";
    redirect(`${fallback}${joiner}error=forbidden`);
  }
}
