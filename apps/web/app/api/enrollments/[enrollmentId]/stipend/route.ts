import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { ensureSystemPayslipForEnrollment } from "@/lib/payslips";
import { getOrgAccess } from "@/lib/org-access";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const CAN_MANAGE_STIPENDS = new Set(["PROVIDER_ADMIN", "COORDINATOR"]);

export async function POST(req: Request, { params }: { params: { enrollmentId: string } }) {
  const form = await req.formData();
  const month = String(form.get("month") ?? "").trim();

  const referer = req.headers.get("referer") ?? "/workspaces";
  const redirectUrl = new URL(referer, req.url);

  if (!MONTH_PATTERN.test(month)) {
    redirectUrl.searchParams.set("error", "invalid-month");
    return NextResponse.redirect(redirectUrl);
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: params.enrollmentId },
    include: { organization: { select: { slug: true, id: true } } }
  });

  if (!enrollment?.organization?.slug) {
    redirectUrl.searchParams.set("error", "invalid-request");
    return NextResponse.redirect(redirectUrl);
  }

  const access = await getOrgAccess(enrollment.organization.slug);
  if ("error" in access || access.membership.organizationId !== enrollment.organization.id || !CAN_MANAGE_STIPENDS.has(access.membership.role)) {
    redirectUrl.searchParams.set("error", "invalid-request");
    return NextResponse.redirect(redirectUrl);
  }

  await prisma.enrollment.update({
    where: { id: params.enrollmentId },
    data: { stipendPaid: true, stipendMonth: month }
  });

  await ensureSystemPayslipForEnrollment(params.enrollmentId, month);

  redirectUrl.searchParams.set("stipend", "updated");
  redirectUrl.searchParams.set("month", month);
  redirectUrl.searchParams.set("enrollment", params.enrollmentId);

  return NextResponse.redirect(redirectUrl);
}
