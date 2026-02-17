import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { ensureSystemPayslipForEnrollment } from "@/lib/payslips";
import { getOrgAccess } from "@/lib/org-access";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const CAN_MANAGE_STIPENDS = new Set(["PROVIDER_ADMIN", "COORDINATOR"]);

export async function POST(req: Request) {
  const form = await req.formData();
  const month = String(form.get("month") ?? "").trim();
  const organizationId = String(form.get("organizationId") ?? "").trim();
  const orgSlug = String(form.get("orgSlug") ?? "").trim();

  const referer = req.headers.get("referer") ?? "/workspaces";
  const redirectUrl = new URL(referer, req.url);

  if (!organizationId || !orgSlug) {
    redirectUrl.searchParams.set("error", "invalid-request");
    return NextResponse.redirect(redirectUrl);
  }

  const access = await getOrgAccess(orgSlug);
  if ("error" in access || access.membership.organizationId !== organizationId || !CAN_MANAGE_STIPENDS.has(access.membership.role)) {
    redirectUrl.searchParams.set("error", "invalid-request");
    return NextResponse.redirect(redirectUrl);
  }

  if (!MONTH_PATTERN.test(month)) {
    redirectUrl.searchParams.set("error", "invalid-month");
    return NextResponse.redirect(redirectUrl);
  }

  const targets = await prisma.enrollment.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      OR: [{ stipendPaid: false }, { stipendMonth: { not: month } }]
    },
    select: { id: true }
  });

  const result = await prisma.enrollment.updateMany({
    where: { id: { in: targets.map((item) => item.id) } },
    data: { stipendPaid: true, stipendMonth: month }
  });

  await Promise.all(targets.map((item) => ensureSystemPayslipForEnrollment(item.id, month)));

  redirectUrl.searchParams.set("stipend", "bulk-updated");
  redirectUrl.searchParams.set("month", month);
  redirectUrl.searchParams.set("count", String(result.count));

  return NextResponse.redirect(redirectUrl);
}
