import { getStorageAdapter } from "@internflow/shared/src/storage";
import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/session";

export async function POST(req: Request) {
  const actor = await getCurrentUser();
  const slug = cookies().get("if_workspace")?.value;
  if (!actor || !slug) return NextResponse.json({ ok: false, error: "Missing session/workspace" }, { status: 401 });

  const membership = await prisma.membership.findFirst({
    where: {
      userId: actor.id,
      organization: { slug },
      role: { in: ["PROVIDER_ADMIN", "COORDINATOR", "SYSTEM_ADMIN"] },
    },
    include: { organization: true },
  });

  if (!membership) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  if (membership.organization.status === "REJECTED") {
    return NextResponse.json({ ok: false, error: "Organization is rejected" }, { status: 409 });
  }

  const form = await req.formData();
  const storage = getStorageAdapter();
  const uploads: Array<{ category: string; file: File }> = [];

  const companyRegistration = form.get("companyRegistration");
  const taxPin = form.get("taxPin");

  if (companyRegistration instanceof File) uploads.push({ category: "CIPC", file: companyRegistration });
  if (taxPin instanceof File) uploads.push({ category: "TAX_PIN", file: taxPin });

  uploads.push({ category: "CK_NUMBER", file: new File([String(form.get("ckNumber") ?? "")], "ck-number.txt", { type: "text/plain" }) });
  uploads.push({ category: "POPIA_CONTACT", file: new File([String(form.get("popiaContact") ?? "")], "popia-contact.txt", { type: "text/plain" }) });

  for (const upload of uploads) {
    const key = `org-docs/${membership.organizationId}/${Date.now()}-${upload.file.name}`;
    await storage.put(key, Buffer.from(await upload.file.arrayBuffer()), upload.file.type || "application/octet-stream");
    await prisma.organizationDocument.create({
      data: {
        orgId: membership.organizationId,
        category: upload.category,
        fileKey: key,
        status: "PENDING_REVIEW"
      }
    });
  }

  await prisma.organization.update({ where: { id: membership.organizationId }, data: { status: "PENDING_REVIEW" } });
  await prisma.auditEvent.create({
    data: {
      tenantId: membership.organizationId,
      userId: actor.id,
      action: "ORG_VERIFICATION_DOCS_SUBMITTED",
      entityType: "Organization",
      entityId: membership.organizationId,
      metadata: { uploads: uploads.map((upload) => upload.category) },
    },
  });

  return NextResponse.json({ ok: true });
}
