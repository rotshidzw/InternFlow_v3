import { prisma } from "@internflow/db/src";
import { getOrgAccess } from "@/lib/org-access";
import { NextResponse } from "next/server";

const ALLOWED_STAFF_ROLES = new Set(["PROVIDER_ADMIN", "COORDINATOR", "SUPERVISOR"]);
const CAN_MANAGE_STAFF = new Set(["PROVIDER_ADMIN", "COORDINATOR"]);

export async function POST(req: Request, { params }: { params: { orgSlug: string } }) {
  const access = await getOrgAccess(params.orgSlug);
  if ("error" in access) return NextResponse.redirect(new URL("/workspaces", req.url));

  if (!CAN_MANAGE_STAFF.has(access.membership.role)) {
    return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/staff?error=forbidden`, req.url));
  }

  const form = await req.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim();
  const role = String(form.get("role") ?? "COORDINATOR").trim().toUpperCase();

  if (!email || !ALLOWED_STAFF_ROLES.has(role)) {
    return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/staff?error=invalid`, req.url));
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: { select: { organizationId: true } }
    }
  });

  const hasDifferentOrgMembership = existingUser
    ? existingUser.memberships.some((membership) => membership.organizationId !== access.membership.organizationId)
    : false;

  if (hasDifferentOrgMembership) {
    return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/staff?error=cross-tenant-user`, req.url));
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { name: name || undefined, role: role as any },
    create: { email, name: name || undefined, role: role as any }
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: access.membership.organizationId } },
    update: { role: role as any },
    create: { userId: user.id, organizationId: access.membership.organizationId, role: role as any }
  });

  return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/staff?saved=1`, req.url));
}
