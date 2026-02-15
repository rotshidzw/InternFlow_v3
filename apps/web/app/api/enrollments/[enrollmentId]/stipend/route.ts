import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: { enrollmentId: string } }) {
  const form = await req.formData();
  const month = String(form.get("month") ?? "");
  await prisma.enrollment.update({ where: { id: params.enrollmentId }, data: { stipendPaid: true, stipendMonth: month || null } });
  return NextResponse.redirect(new URL(req.headers.get("referer") ?? "/workspaces", req.url));
}
