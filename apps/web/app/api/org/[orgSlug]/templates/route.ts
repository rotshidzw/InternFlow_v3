import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: { orgSlug: string } }) {
  const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
  if (!org) return NextResponse.redirect(new URL("/workspaces", req.url));

  const form = await req.formData();
  const name = String(form.get("name") ?? "").trim();
  const type = String(form.get("type") ?? "CHECKLIST");
  const setaCetaName = String(form.get("setaCetaName") ?? "").trim();
  const jsonRaw = String(form.get("json") ?? "{}");

  let parsedJson: unknown = {};
  try { parsedJson = JSON.parse(jsonRaw); } catch { parsedJson = { raw: jsonRaw }; }

  await prisma.settings.create({
    data: {
      organizationId: org.id,
      key: `template_${Date.now()}`,
      value: { name, type, setaCetaName, config: parsedJson }
    }
  });

  return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/templates`, req.url));
}
