import { prisma } from "@internflow/db/src";
import { getStorageAdapter } from "@internflow/shared/src/storage";
import { NextResponse } from "next/server";
import { getOrgAccess } from "@/lib/org-access";
import {
  applyCertificateReleaseTransitionsWithAudit,
  loadOrganizationCertificateRecords,
} from "@/lib/provider-operations";

export async function GET(_: Request, { params }: { params: { orgSlug: string; documentId: string } }) {
  const access = await getOrgAccess(params.orgSlug);
  if ("error" in access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const isStudent = access.membership.role === "STUDENT";

  await applyCertificateReleaseTransitionsWithAudit({
    organizationId: access.membership.organizationId,
    actorUserId: access.user.id,
  });

  const doc = await prisma.document.findFirst({
    where: { id: params.documentId, organizationId: access.membership.organizationId, type: "CERTIFICATE" },
    include: { versions: { orderBy: { createdAt: "desc" }, take: 1 }, user: true }
  });
  if (!doc || !doc.versions[0]) return NextResponse.json({ error: "Certificate not found" }, { status: 404 });

  const certificateRecords = await loadOrganizationCertificateRecords(
    access.membership.organizationId,
  );
  const certificateRecord = certificateRecords.find((record) => record.documentId === doc.id);

  if (isStudent) {
    if (!certificateRecord) {
      return NextResponse.json({ error: "Certificate not released yet." }, { status: 403 });
    }
    if (certificateRecord.status !== "RELEASED") {
      return NextResponse.json(
        {
          error: "Certificate is issued but delayed-release policy is still active.",
          releaseAt: certificateRecord.releaseAt,
        },
        { status: 403 },
      );
    }
  }

  let bytes: Uint8Array;
  try {
    bytes = await getStorageAdapter().getBuffer(doc.versions[0].storageKey);
  } catch {
    return NextResponse.json({ error: "Certificate file is unavailable" }, { status: 404 });
  }

  await prisma.auditEvent.create({
    data: {
      tenantId: access.membership.organizationId,
      userId: access.user.id,
      action: "CERTIFICATE_DOWNLOADED",
      entityType: "Certificate",
      entityId: certificateRecord?.id ?? doc.id,
      metadata: {
        type: "CERTIFICATE",
        documentId: doc.id,
        storageKey: doc.versions[0].storageKey,
        status: certificateRecord?.status ?? "UNTRACKED",
      }
    }
  });

  const safeName = (doc.user.name ?? doc.user.email).replace(/[^a-zA-Z0-9._-]+/g, "_");
  return new NextResponse(bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"${safeName}_Certificate.pdf\"`
    }
  });
}
