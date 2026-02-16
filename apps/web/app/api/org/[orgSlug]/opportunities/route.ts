import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: { orgSlug: string } }) {
  const form = await req.formData();
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const type = String(form.get("type") ?? "INTERNSHIP");
  const status = String(form.get("status") ?? "PUBLISHED");
  const programId = String(form.get("programId") ?? "");
  const requirements = String(form.get("requirements") ?? "");
  const capacity = Math.max(1, Number(form.get("capacity") ?? 50) || 50);

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
      status: status === "DRAFT" ? "DRAFT" : "PUBLISHED",
      capacity,
      requirementsJson: {
        source: "tenant-portal",
        keywords: requirements
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
      }
    }
  });

  return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/opportunities`, req.url));
}
