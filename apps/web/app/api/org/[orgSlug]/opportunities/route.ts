import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: { orgSlug: string } }) {
  const form = await req.formData();
  const title = String(form.get("title") ?? "");
  const description = String(form.get("description") ?? "");
  const type = String(form.get("type") ?? "INTERNSHIP");
  if (!title || !description) return NextResponse.redirect(new URL(`/org/${params.orgSlug}/provider-admin`, req.url));

  const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
  if (!org) return NextResponse.redirect(new URL("/workspaces", req.url));
  const program = await prisma.program.findFirst({ where: { organizationId: org.id } });

  await prisma.opportunity.create({
    data: {
      organizationId: org.id,
      programId: program?.id,
      title,
      slug: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      description,
      type: type as any,
      status: "PUBLISHED",
      capacity: 50
    }
  });

  return NextResponse.redirect(new URL(`/org/${params.orgSlug}/provider-admin`, req.url));
}
