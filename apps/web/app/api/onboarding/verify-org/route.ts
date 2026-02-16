import { getStorageAdapter } from "@internflow/shared/src/storage";
import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const email = cookies().get("if_user")?.value;
  const slug = cookies().get("if_workspace")?.value;
  if (!email || !slug) return NextResponse.json({ ok: false, error: "Missing session/workspace" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) return NextResponse.json({ ok: false, error: "Organization not found" }, { status: 404 });

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
    const key = `org-docs/${org.id}/${Date.now()}-${upload.file.name}`;
    await storage.put(key, Buffer.from(await upload.file.arrayBuffer()), upload.file.type || "application/octet-stream");
    await prisma.organizationDocument.create({
      data: {
        orgId: org.id,
        category: upload.category,
        fileKey: key,
        status: "PENDING_REVIEW"
      }
    });
  }

  await prisma.organization.update({ where: { id: org.id }, data: { status: "PENDING_REVIEW" } });
  return NextResponse.json({ ok: true });
}
