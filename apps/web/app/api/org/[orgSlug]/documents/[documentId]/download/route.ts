import { prisma } from "@internflow/db/src";
import { getStorageAdapter } from "@internflow/shared/src/storage";
import { NextResponse } from "next/server";
import {
  TENANT_ROLE_GROUPS,
  resolveTenantApiActor,
  tenantApiAuthErrorResponse,
} from "@/lib/tenant-api-auth";

function safeName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

export async function GET(
  _: Request,
  { params }: { params: { orgSlug: string; documentId: string } },
) {
  const actor = await resolveTenantApiActor({
    orgSlug: params.orgSlug,
    allowedRoles: TENANT_ROLE_GROUPS.EXPORT_READ,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const orgId = actor.actor.membership.organizationId;
  const document = await prisma.document.findFirst({
    where: {
      id: params.documentId,
      OR: [
        { organizationId: orgId },
        { user: { memberships: { some: { organizationId: orgId } } } },
      ],
    },
    include: {
      versions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!document || !document.versions[0]) {
    return NextResponse.json({ ok: false, error: "Document not found" }, { status: 404 });
  }

  const version = document.versions[0];
  const bytes = await getStorageAdapter().getBuffer(version.storageKey);
  const extension = version.storageKey.split(".").pop() ?? "bin";
  const fileName = `${safeName(document.type)}_${safeName(document.id)}.${safeName(extension)}`;

  await prisma.auditEvent.create({
    data: {
      tenantId: orgId,
      userId: actor.actor.user.id,
      action: "DOCUMENT_DOWNLOADED",
      entityType: "Document",
      entityId: document.id,
      metadata: { type: document.type },
    },
  });

  return new NextResponse(bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": version.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
