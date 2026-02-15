import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ status: z.enum(["SHORTLISTED", "ACCEPTED", "REJECTED"]) });

export async function POST(req: Request, { params }: { params: { applicationId: string } }) {
  const payload = Object.fromEntries(await req.formData());
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const application = await prisma.application.update({
    where: { id: params.applicationId },
    data: { status: parsed.data.status },
    include: { opportunity: true }
  });

  if (parsed.data.status === "ACCEPTED") {
    const existing = await prisma.enrollment.findFirst({ where: { userId: application.userId, organizationId: application.opportunity.organizationId } });
    if (!existing && application.opportunity.programId) {
      await prisma.enrollment.create({
        data: {
          organizationId: application.opportunity.organizationId,
          userId: application.userId,
          programId: application.opportunity.programId,
          status: "PENDING"
        }
      });
    }
  }

  return NextResponse.redirect(new URL(req.headers.get("referer") ?? "/workspaces", req.url));
}
