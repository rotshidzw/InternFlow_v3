import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: { orgSlug: string } }) {
  const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
  if (!org) return NextResponse.redirect(new URL("/workspaces", req.url));

  const form = await req.formData();
  const logoUrl = String(form.get("logoUrl") ?? "");
  const primaryColor = String(form.get("primaryColor") ?? "#0f766e");
  const allowedDomains = String(form.get("allowedDomains") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  const existing = await prisma.settings.findFirst({ where: { organizationId: org.id, key: "tenant_branding" } });
  const value = { logoUrl, primaryColor, allowedDomains };
  if (existing) {
    await prisma.settings.update({ where: { id: existing.id }, data: { value } });
  } else {
    await prisma.settings.create({ data: { organizationId: org.id, key: "tenant_branding", value } });
  }

  return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/settings`, req.url));
}
