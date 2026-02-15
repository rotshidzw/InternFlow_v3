import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { requirePlatformApiUser } from "@/lib/hq/api-auth";
import { sendPlatformEmailMany } from "@/lib/mailer";
import { getTenantContactEmails } from "@/lib/hq/tenant-contacts";

export async function POST(req: Request, { params }: { params: { verificationId: string } }) {
  const actor = await requirePlatformApiUser();
  if (!actor) return NextResponse.json({ ok: false }, { status: 403 });
  const form = await req.formData();
  const decision = String(form.get("decision") ?? "REJECTED");
  const reason = String(form.get("reason") ?? "");

  const verification = await prisma.organizationVerification.findUnique({ where: { id: params.verificationId }, include: { organization: true } });
  if (!verification) return NextResponse.redirect(new URL("/hq/approvals", req.url));

  await prisma.organizationVerification.update({ where: { id: verification.id }, data: { status: decision as any, reason: reason || null } });
  await prisma.organization.update({ where: { id: verification.orgId }, data: { status: decision === "APPROVED" ? "APPROVED" : "REJECTED", rejectionReason: decision === "REJECTED" ? reason : null } });

  await prisma.auditLog.create({ data: { scope: "PLATFORM", actorUserId: actor.user.id, orgId: verification.orgId, action: `HQ_ORG_${decision}`, metadata: { reason } } });

  const recipients = await getTenantContactEmails(verification.orgId);
  await sendPlatformEmailMany(recipients, `Verification ${decision}`, `${verification.organization.name} was ${decision}. ${reason || ""}`);

  return NextResponse.redirect(new URL("/hq/approvals", req.url));
}
