import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: { orgSlug: string; entryId: string } }) {
  const email = cookies().get("if_user")?.value;
  if (!email) return NextResponse.redirect(new URL("/auth", req.url));
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.redirect(new URL("/auth", req.url));

  const form = await req.formData();
  const status = String(form.get("status") ?? "APPROVED");
  const comment = String(form.get("comment") ?? "");

  await prisma.logbookApproval.create({ data: { entryId: params.entryId, reviewerId: user.id, status, comment } });

  return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/logbooks`, req.url));
}
