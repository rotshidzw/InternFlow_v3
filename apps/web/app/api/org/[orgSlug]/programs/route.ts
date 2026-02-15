import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: { orgSlug: string } }) {
  const form = await req.formData();
  const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
  if (!org) return NextResponse.redirect(new URL("/workspaces", req.url));

  const name = String(form.get("name") ?? "").trim();
  const description = String(form.get("description") ?? "Program setup").trim();
  const setaCetaName = String(form.get("setaCetaName") ?? "").trim();
  const startDate = new Date(String(form.get("startDate") ?? new Date().toISOString().slice(0, 10)));
  const endDate = new Date(String(form.get("endDate") ?? new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)));

  if (!name) return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/programs`, req.url));

  await prisma.program.create({
    data: {
      organizationId: org.id,
      name,
      description,
      rulesJson: { setaCetaName },
      startDate,
      endDate
    }
  });

  return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/programs`, req.url));
}
