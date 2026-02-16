import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: { orgSlug: string } }) {
  const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
  if (!org) return NextResponse.redirect(new URL("/workspaces", req.url));

  const form = await req.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim();
  const role = String(form.get("role") ?? "COORDINATOR");

  if (!email) return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/staff`, req.url));

  const user = await prisma.user.upsert({ where: { email }, update: { name: name || undefined }, create: { email, name: name || undefined, role: role as any } });
  await prisma.membership.upsert({ where: { userId_organizationId: { userId: user.id, organizationId: org.id } }, update: { role: role as any }, create: { userId: user.id, organizationId: org.id, role: role as any } });

  return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/staff`, req.url));
}
