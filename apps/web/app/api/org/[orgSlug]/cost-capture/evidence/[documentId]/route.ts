import { prisma } from "@internflow/db/src";
import { getStorageAdapter } from "@internflow/shared/src/storage";
import { NextResponse } from "next/server";
import {
  TENANT_ROLE_GROUPS,
  resolveTenantApiActor,
  tenantApiAuthErrorResponse,
} from "@/lib/tenant-api-auth";

export async function GET(
  _: Request,
  { params }: { params: { orgSlug: string; documentId: string } },
) {
  const actor = await resolveTenantApiActor({
    orgSlug: params.orgSlug,
    allowedRoles: TENANT_ROLE_GROUPS.EXPORT_READ,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const evidence = await prisma.organizationDocument.findFirst({
    where: {
      id: params.documentId,
      orgId: actor.actor.membership.organizationId,
      category: "COST_CAPTURE_EVIDENCE",
    },
  });
  if (!evidence) {
    return NextResponse.json({ ok: false, error: "Evidence not found" }, { status: 404 });
  }

  const bytes = await getStorageAdapter().getBuffer(evidence.fileKey);
  const fileName = evidence.fileKey.split("/").pop() ?? "cost-evidence";

  return new NextResponse(bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
