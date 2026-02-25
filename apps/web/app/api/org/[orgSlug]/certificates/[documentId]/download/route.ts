import { prisma } from "@internflow/db/src";
import { getStorageAdapter } from "@internflow/shared/src/storage";
import { NextResponse } from "next/server";
import { getOrgAccess } from "@/lib/org-access";

export async function GET(_: Request, { params }: { params: { orgSlug: string; documentId: string } }) {
  const access = await getOrgAccess(params.orgSlug);
  if ("error" in access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await prisma.document.findFirst({
    where: { id: params.documentId, organizationId: access.membership.organizationId, type: "CERTIFICATE" },
    include: { versions: { orderBy: { createdAt: "desc" }, take: 1 }, user: true }
  });
  if (!doc || !doc.versions[0]) return NextResponse.json({ error: "Certificate not found" }, { status: 404 });

  const bytes = await getStorageAdapter().getBuffer(doc.versions[0].storageKey);
  const safeName = (doc.user.name ?? doc.user.email).replace(/[^a-zA-Z0-9._-]+/g, "_");
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"${safeName}_Certificate.pdf\"`
    }
  });
}
