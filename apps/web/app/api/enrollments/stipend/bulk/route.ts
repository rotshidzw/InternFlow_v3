import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function POST(req: Request) {
  const form = await req.formData();
  const month = String(form.get("month") ?? "").trim();
  const organizationId = String(form.get("organizationId") ?? "").trim();

  const referer = req.headers.get("referer") ?? "/workspaces";
  const redirectUrl = new URL(referer, req.url);

  if (!organizationId) {
    redirectUrl.searchParams.set("error", "invalid-request");
    return NextResponse.redirect(redirectUrl);
  }

  if (!MONTH_PATTERN.test(month)) {
    redirectUrl.searchParams.set("error", "invalid-month");
    return NextResponse.redirect(redirectUrl);
  }

  const result = await prisma.enrollment.updateMany({
    where: {
      organizationId,
      status: "ACTIVE",
      OR: [{ stipendPaid: false }, { stipendMonth: { not: month } }]
    },
    data: { stipendPaid: true, stipendMonth: month }
  });

  redirectUrl.searchParams.set("stipend", "bulk-updated");
  redirectUrl.searchParams.set("month", month);
  redirectUrl.searchParams.set("count", String(result.count));

  return NextResponse.redirect(redirectUrl);
}
