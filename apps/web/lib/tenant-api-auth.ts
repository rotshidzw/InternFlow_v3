import { prisma } from "@internflow/db/src";
import type { Role } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const TENANT_ROLE = {
  STUDENT: "STUDENT",
  SUPERVISOR: "SUPERVISOR",
  COORDINATOR: "COORDINATOR",
  PROVIDER_ADMIN: "PROVIDER_ADMIN",
  TRAINER: "TRAINER",
  FACILITATOR: "FACILITATOR",
  FINANCE: "FINANCE",
  PAYROLL: "PAYROLL",
  AUDITOR: "AUDITOR",
  READ_ONLY: "READ_ONLY",
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
} as const;

export const TENANT_ROLE_GROUPS = {
  APP_REVIEW: [
    TENANT_ROLE.PROVIDER_ADMIN,
    TENANT_ROLE.COORDINATOR,
    TENANT_ROLE.SUPERVISOR,
    TENANT_ROLE.TRAINER,
    TENANT_ROLE.FACILITATOR,
    TENANT_ROLE.SYSTEM_ADMIN,
  ],
  STIPEND_MANAGE: [
    TENANT_ROLE.PROVIDER_ADMIN,
    TENANT_ROLE.COORDINATOR,
    TENANT_ROLE.FINANCE,
    TENANT_ROLE.PAYROLL,
    TENANT_ROLE.SYSTEM_ADMIN,
  ],
  CONTENT_MANAGE: [
    TENANT_ROLE.PROVIDER_ADMIN,
    TENANT_ROLE.COORDINATOR,
    TENANT_ROLE.SYSTEM_ADMIN,
  ],
  SETTINGS_MANAGE: [
    TENANT_ROLE.PROVIDER_ADMIN,
    TENANT_ROLE.COORDINATOR,
    TENANT_ROLE.SYSTEM_ADMIN,
  ],
  STAFF_MANAGE: [
    TENANT_ROLE.PROVIDER_ADMIN,
    TENANT_ROLE.COORDINATOR,
    TENANT_ROLE.SYSTEM_ADMIN,
  ],
  CHECKLIST_MANAGE: [
    TENANT_ROLE.PROVIDER_ADMIN,
    TENANT_ROLE.COORDINATOR,
    TENANT_ROLE.SUPERVISOR,
    TENANT_ROLE.TRAINER,
    TENANT_ROLE.FACILITATOR,
    TENANT_ROLE.SYSTEM_ADMIN,
  ],
  EXPORT_READ: [
    TENANT_ROLE.PROVIDER_ADMIN,
    TENANT_ROLE.COORDINATOR,
    TENANT_ROLE.SUPERVISOR,
    TENANT_ROLE.TRAINER,
    TENANT_ROLE.FACILITATOR,
    TENANT_ROLE.FINANCE,
    TENANT_ROLE.PAYROLL,
    TENANT_ROLE.AUDITOR,
    TENANT_ROLE.READ_ONLY,
    TENANT_ROLE.SYSTEM_ADMIN,
  ],
  READ_ONLY: [TENANT_ROLE.AUDITOR, TENANT_ROLE.READ_ONLY],
  INVITABLE_STAFF: [
    TENANT_ROLE.PROVIDER_ADMIN,
    TENANT_ROLE.COORDINATOR,
    TENANT_ROLE.SUPERVISOR,
    TENANT_ROLE.TRAINER,
    TENANT_ROLE.FACILITATOR,
    TENANT_ROLE.FINANCE,
    TENANT_ROLE.PAYROLL,
    TENANT_ROLE.AUDITOR,
    TENANT_ROLE.READ_ONLY,
  ],
} as const;

export const PERSISTED_TENANT_ROLES: readonly Role[] = [
  "STUDENT",
  "SUPERVISOR",
  "COORDINATOR",
  "PROVIDER_ADMIN",
  "SYSTEM_ADMIN",
];

type TenantActor = {
  user: Awaited<ReturnType<typeof prisma.user.findUnique>> extends infer T
    ? NonNullable<T>
    : never;
  membership: Awaited<ReturnType<typeof prisma.membership.findFirst>> extends infer T
    ? NonNullable<T>
    : never;
};

type TenantActorFailure = {
  ok: false;
  status: 401 | 403;
  error: string;
};

type TenantActorSuccess = {
  ok: true;
  actor: TenantActor;
};

type TenantActorResult = TenantActorFailure | TenantActorSuccess;

type ResolveActorArgs = {
  orgSlug?: string;
  organizationId?: string;
  allowedRoles?: readonly string[];
};

function normalizeRole(value: string) {
  return value.trim().toUpperCase();
}

function hasAllowedRole(role: string, allowedRoles?: readonly string[]) {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  const expected = allowedRoles.map(normalizeRole);
  return expected.includes(normalizeRole(role));
}

export function isTenantRoleAllowed(role: string, allowedRoles: readonly string[]) {
  return hasAllowedRole(role, allowedRoles);
}

export function isPersistedTenantRole(role: string): role is Role {
  return PERSISTED_TENANT_ROLES.includes(role as Role);
}

export async function getApiUserFromCookie() {
  const email = cookies().get("if_user")?.value;
  if (!email) return null;
  return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
}

export async function resolveTenantApiActor({
  orgSlug,
  organizationId,
  allowedRoles,
}: ResolveActorArgs): Promise<TenantActorResult> {
  const user = await getApiUserFromCookie();
  if (!user) return { ok: false, status: 401, error: "Unauthorized" };

  const where = orgSlug
    ? { userId: user.id, organization: { slug: orgSlug } }
    : { userId: user.id, organizationId: organizationId ?? "" };

  const membership = await prisma.membership.findFirst({
    where,
    include: { organization: true },
  });

  if (!membership) return { ok: false, status: 403, error: "Forbidden" };
  if (membership.organization.status !== "APPROVED") {
    return { ok: false, status: 403, error: "Organization not approved" };
  }
  if (!hasAllowedRole(membership.role, allowedRoles)) {
    return { ok: false, status: 403, error: "Insufficient role permissions" };
  }

  return { ok: true, actor: { user, membership } };
}

export function tenantApiAuthErrorResponse(failure: TenantActorFailure) {
  return NextResponse.json({ ok: false, error: failure.error }, { status: failure.status });
}

export async function requireTenantApiActor(
  orgSlug: string,
  allowedRoles?: readonly string[],
) {
  const result = await resolveTenantApiActor({ orgSlug, allowedRoles });
  return result.ok ? result.actor : null;
}
