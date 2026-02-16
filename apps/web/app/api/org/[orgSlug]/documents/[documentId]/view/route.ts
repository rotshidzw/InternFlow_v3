import { prisma } from "@internflow/db/src";
import { getStorageAdapter } from "@internflow/shared/src/storage";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { orgSlug: string; documentId: string } }
) {
  const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
  if (!org) return new NextResponse("Organization not found", { status: 404 });

  const document = await prisma.document.findUnique({
    where: { id: params.documentId },
    include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } }
  });

  if (!document) return new NextResponse("Document not found", { status: 404 });

  const member = await prisma.membership.findFirst({
    where: { organizationId: org.id, userId: document.userId },
    select: { id: true }
  });

  if (!member) return new NextResponse("Document not available for this organization", { status: 404 });

  const latestVersion = document.versions[0];
  if (!latestVersion) return new NextResponse("No document version found", { status: 404 });

  const signedUrl = await getStorageAdapter().getSignedUrl(latestVersion.storageKey);
  return NextResponse.redirect(signedUrl);
}
