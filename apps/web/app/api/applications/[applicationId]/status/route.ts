import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";

const schema = z.object({ status: z.enum(["SHORTLISTED", "ACCEPTED", "REJECTED"]) });
const CAN_REVIEW_APPS = new Set(["PROVIDER_ADMIN", "COORDINATOR"]);

export async function POST(req: Request, { params }: { params: { applicationId: string } }) {
  const payload = Object.fromEntries(await req.formData());
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const email = cookies().get("if_user")?.value;
  if (!email) return NextResponse.redirect(new URL("/auth", req.url));
  const actor = await prisma.user.findUnique({ where: { email } });
  if (!actor) return NextResponse.redirect(new URL("/auth", req.url));

  const application = await prisma.application.findUnique({
    where: { id: params.applicationId },
    include: { opportunity: true }
  });
  if (!application) return NextResponse.redirect(new URL(req.headers.get("referer") ?? "/workspaces", req.url));

  const membership = await prisma.membership.findFirst({
    where: { userId: actor.id, organizationId: application.opportunity.organizationId }
  });
  if (!membership || !CAN_REVIEW_APPS.has(membership.role)) {
    return NextResponse.redirect(new URL(req.headers.get("referer") ?? "/workspaces", req.url));
  }

  const updated = await prisma.application.update({
    where: { id: params.applicationId },
    data: { status: parsed.data.status },
    include: { opportunity: true }
  });

  if (parsed.data.status === "ACCEPTED") {
    const existing = await prisma.enrollment.findFirst({ where: { userId: updated.userId, organizationId: updated.opportunity.organizationId } });
    if (!existing && updated.opportunity.programId) {
      await prisma.enrollment.create({
        data: {
          organizationId: updated.opportunity.organizationId,
          userId: updated.userId,
          programId: updated.opportunity.programId,
          status: "PENDING"
        }
      });
    }
  }

  return NextResponse.redirect(new URL(req.headers.get("referer") ?? "/workspaces", req.url));
}
