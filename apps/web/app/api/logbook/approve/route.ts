import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const formData = await req.formData();
  const entryId = String(formData.get("entryId"));
  const status = String(formData.get("status") ?? "PENDING");
  const comment = String(formData.get("comment") ?? "");
  const reviewer = await prisma.user.findUnique({ where: { email: "supervisor@demo.com" } });
  if (!reviewer) return NextResponse.json({ error: "Reviewer not found" }, { status: 404 });

  await prisma.logbookApproval.create({ data: { entryId, reviewerId: reviewer.id, status, comment } });
  return NextResponse.redirect(new URL("/app/supervisor", req.url));
}
