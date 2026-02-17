import { prisma } from "@internflow/db/src";
import { getOrgAccess } from "@/lib/org-access";
import { NextResponse } from "next/server";

const CAN_MANAGE_STAFF = new Set(["PROVIDER_ADMIN", "COORDINATOR"]);

export async function POST(
  req: Request,
  { params }: { params: { orgSlug: string; membershipId: string } }
) {
  const access = await getOrgAccess(params.orgSlug);
  if ("error" in access) return NextResponse.redirect(new URL("/workspaces", req.url));

  if (!CAN_MANAGE_STAFF.has(access.membership.role)) {
    return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/staff?error=forbidden`, req.url));
  }

  await prisma.membership.deleteMany({
    where: {
      id: params.membershipId,
      organizationId: access.membership.organizationId,
      NOT: { userId: access.user.id },
      role: { in: ["PROVIDER_ADMIN", "COORDINATOR", "SUPERVISOR"] }
    }
  });

  return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/staff?saved=1`, req.url));
}
