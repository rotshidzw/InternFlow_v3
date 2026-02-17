import { prisma } from "@internflow/db/src";
import { getStorageAdapter } from "@internflow/shared/src/storage";
import { getOrgAccess } from "@/lib/org-access";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { orgSlug: string; entryId: string } }
) {
  const access = await getOrgAccess(params.orgSlug);
  if ("error" in access) {
    return new NextResponse("Unauthorized", { status: access.error === "unauthenticated" ? 401 : 403 });
  }

  const entry = await prisma.logbookEntry.findFirst({
    where: {
      id: params.entryId,
      user: {
        memberships: {
          some: { organizationId: access.membership.organizationId }
        }
      }
    },
    select: { evidenceKey: true }
  });

  if (!entry?.evidenceKey) return new NextResponse("Logbook evidence document not found", { status: 404 });

  const signedUrl = await getStorageAdapter().getSignedUrl(entry.evidenceKey);
  return NextResponse.redirect(signedUrl);
}
