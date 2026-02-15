import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: { orgSlug: string } }) {
  const form = await req.formData();
  const title = String(form.get("title") ?? "");
  const description = String(form.get("description") ?? "");
  const type = String(form.get("type") ?? "INTERNSHIP");
  const programId = String(form.get("programId") ?? "");

  if (!title || !description) return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/opportunities`, req.url));

  const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
  if (!org) return NextResponse.redirect(new URL("/workspaces", req.url));

  await prisma.opportunity.create({
    data: {
      organizationId: org.id,
      programId: programId || null,
      title,
      slug: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      description,
      type: type as any,
      status: "PUBLISHED",
      capacity: 50,
      requirementsJson: { source: "tenant-portal" }
    }
  });

  return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/opportunities`, req.url));
}
