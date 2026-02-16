import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: { orgSlug: string } }) {
  const org = await prisma.organization.findUnique({ where: { slug: params.orgSlug } });
  if (!org) return NextResponse.redirect(new URL("/workspaces", req.url));

  const form = await req.formData();
  const templateId = String(form.get("templateId") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  const type = String(form.get("type") ?? "CHECKLIST");
  const status = String(form.get("status") ?? "DRAFT");
  const setaCetaName = String(form.get("setaCetaName") ?? "").trim();
  const jsonRaw = String(form.get("json") ?? "{}");

  let parsedJson: unknown = {};
  try {
    parsedJson = JSON.parse(jsonRaw);
  } catch {
    parsedJson = {};
  }

  const value = { name, type, status, setaCetaName, config: parsedJson };

  if (templateId) {
    await prisma.settings.updateMany({
      where: { id: templateId, organizationId: org.id, key: { startsWith: "template_" } },
      data: { value }
    });
  } else {
    await prisma.settings.create({
      data: {
        organizationId: org.id,
        key: `template_${Date.now()}`,
        value
      }
    });
  }

  return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/templates`, req.url));
}
