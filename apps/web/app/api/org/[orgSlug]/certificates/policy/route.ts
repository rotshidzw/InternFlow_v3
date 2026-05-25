import { NextResponse } from "next/server";
import {
  CERTIFICATE_RELEASE_RULES,
  loadOrganizationCertificatePolicyRecords,
  saveOrganizationCertificatePolicyRecords,
  type CertificatePolicyRecord,
} from "@/lib/provider-operations";
import {
  TENANT_ROLE_GROUPS,
  resolveTenantApiActor,
  tenantApiAuthErrorResponse,
} from "@/lib/tenant-api-auth";
import { prisma } from "@internflow/db/src";

export async function GET(_: Request, { params }: { params: { orgSlug: string } }) {
  const actor = await resolveTenantApiActor({
    orgSlug: params.orgSlug,
    allowedRoles: TENANT_ROLE_GROUPS.EXPORT_READ,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const records = await loadOrganizationCertificatePolicyRecords(
    actor.actor.membership.organizationId,
  );
  return NextResponse.json({ ok: true, records });
}

export async function POST(req: Request, { params }: { params: { orgSlug: string } }) {
  const actor = await resolveTenantApiActor({
    orgSlug: params.orgSlug,
    allowedRoles: TENANT_ROLE_GROUPS.APP_REVIEW,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const form = await req.formData();
  const programIdRaw = String(form.get("programId") ?? "").trim();
  const releaseRuleRaw = String(form.get("releaseRule") ?? "").trim().toUpperCase();

  if (
    !CERTIFICATE_RELEASE_RULES.includes(
      releaseRuleRaw as (typeof CERTIFICATE_RELEASE_RULES)[number],
    )
  ) {
    return NextResponse.json({ ok: false, error: "invalid release rule" }, { status: 400 });
  }

  const orgId = actor.actor.membership.organizationId;
  const records = await loadOrganizationCertificatePolicyRecords(orgId);
  const recordId = `policy:${programIdRaw || "default"}`;
  const nextRecord: CertificatePolicyRecord = {
    id: recordId,
    programId: programIdRaw || null,
    releaseRule: releaseRuleRaw as CertificatePolicyRecord["releaseRule"],
    updatedAt: new Date().toISOString(),
    updatedByUserId: actor.actor.user.id,
  };

  const merged = records.filter((record) => record.id !== recordId);
  merged.push(nextRecord);
  await saveOrganizationCertificatePolicyRecords(orgId, merged);

  await prisma.auditEvent.create({
    data: {
      tenantId: orgId,
      userId: actor.actor.user.id,
      action: "CERTIFICATE_POLICY_UPDATED",
      entityType: "CertificatePolicy",
      entityId: nextRecord.id,
      metadata: {
        programId: nextRecord.programId,
        releaseRule: nextRecord.releaseRule,
      },
    },
  });

  return NextResponse.redirect(new URL(req.headers.get("referer") ?? "/workspaces", req.url));
}
