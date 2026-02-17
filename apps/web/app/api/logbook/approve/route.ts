import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const CAN_REVIEW_LOGBOOK = new Set(["SUPERVISOR", "COORDINATOR", "PROVIDER_ADMIN"]);

export async function POST(req: Request) {
  const formData = await req.formData();
  const entryId = String(formData.get("entryId") ?? "");
  const status = String(formData.get("status") ?? "PENDING");
  const comment = String(formData.get("comment") ?? "");

  if (!entryId) return NextResponse.json({ error: "entryId required" }, { status: 400 });

  const email = cookies().get("if_user")?.value;
  if (!email) return NextResponse.redirect(new URL("/auth", req.url));
  const reviewer = await prisma.user.findUnique({ where: { email } });
  if (!reviewer) return NextResponse.redirect(new URL("/auth", req.url));

  const entry = await prisma.logbookEntry.findUnique({ where: { id: entryId } });
  if (!entry) return NextResponse.redirect(new URL(req.headers.get("referer") ?? "/workspaces", req.url));

  const learnerMemberships = await prisma.membership.findMany({
    where: { userId: entry.userId },
    select: { organizationId: true }
  });
  const learnerOrgIds = learnerMemberships.map((membership) => membership.organizationId);

  const membership = await prisma.membership.findFirst({
    where: {
      userId: reviewer.id,
      organizationId: { in: learnerOrgIds }
    }
  });

  if (!membership || !CAN_REVIEW_LOGBOOK.has(membership.role)) {
    return NextResponse.redirect(new URL(req.headers.get("referer") ?? "/workspaces", req.url));
  }

  await prisma.logbookApproval.create({ data: { entryId, reviewerId: reviewer.id, status, comment } });
  return NextResponse.redirect(new URL("/app/supervisor", req.url));
}
