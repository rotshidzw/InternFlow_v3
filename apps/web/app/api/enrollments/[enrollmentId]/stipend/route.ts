import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function POST(req: Request, { params }: { params: { enrollmentId: string } }) {
  const form = await req.formData();
  const month = String(form.get("month") ?? "").trim();

  const referer = req.headers.get("referer") ?? "/workspaces";
  const redirectUrl = new URL(referer, req.url);

  if (!MONTH_PATTERN.test(month)) {
    redirectUrl.searchParams.set("error", "invalid-month");
    return NextResponse.redirect(redirectUrl);
  }

  await prisma.enrollment.update({
    where: { id: params.enrollmentId },
    data: { stipendPaid: true, stipendMonth: month }
  });

  redirectUrl.searchParams.set("stipend", "updated");
  redirectUrl.searchParams.set("month", month);
  redirectUrl.searchParams.set("enrollment", params.enrollmentId);

  return NextResponse.redirect(redirectUrl);
}
