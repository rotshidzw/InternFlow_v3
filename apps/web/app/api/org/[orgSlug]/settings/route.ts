import { prisma } from "@internflow/db/src";
import { getOrgAccess } from "@/lib/org-access";
import { NextResponse } from "next/server";

const CAN_MANAGE_SETTINGS = new Set(["PROVIDER_ADMIN", "COORDINATOR"]);

export async function POST(req: Request, { params }: { params: { orgSlug: string } }) {
  const access = await getOrgAccess(params.orgSlug);
  if ("error" in access) return NextResponse.redirect(new URL("/workspaces", req.url));

  if (!CAN_MANAGE_SETTINGS.has(access.membership.role)) {
    return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/settings?error=forbidden`, req.url));
  }

  const form = await req.formData();
  const logoUrl = String(form.get("logoUrl") ?? "").trim();
  const primaryColor = String(form.get("primaryColor") ?? "#0f766e").trim();
  const allowedDomains = String(form.get("allowedDomains") ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const existing = await prisma.settings.findFirst({ where: { organizationId: access.membership.organizationId, key: "tenant_branding" } });
  const value = { logoUrl, primaryColor, allowedDomains };

  if (existing) {
    await prisma.settings.update({ where: { id: existing.id }, data: { value } });
  } else {
    await prisma.settings.create({
      data: {
        organizationId: access.membership.organizationId,
        key: "tenant_branding",
        value
      }
    });
  }

  await prisma.auditLog.create({
    data: {
      scope: "ORG",
      actorUserId: access.user.id,
      orgId: access.membership.organizationId,
      action: "TENANT_SETTINGS_UPDATED",
      metadata: { allowedDomainsCount: allowedDomains.length, primaryColor }
    }
  });

  return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/settings?saved=1`, req.url));
}
