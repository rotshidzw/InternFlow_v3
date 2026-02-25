import { prisma } from "@internflow/db/src";
import { getStorageAdapter } from "@internflow/shared/src/storage";
import { NextResponse } from "next/server";
import { getOrgAccess } from "@/lib/org-access";

export async function GET(_: Request, { params }: { params: { orgSlug: string } }) {
  const access = await getOrgAccess(params.orgSlug);
  if ("error" in access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const registers = await prisma.organizationDocument.findMany({
    where: { orgId: access.membership.organizationId, category: "ATTENDANCE_REGISTER" },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return NextResponse.json({ ok: true, registers });
}

export async function POST(req: Request, { params }: { params: { orgSlug: string } }) {
  const access = await getOrgAccess(params.orgSlug);
  if ("error" in access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const programmeId = String(form.get("programmeId") ?? "general");
  if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const key = `registers/${access.membership.organizationId}/${programmeId}/${Date.now()}-${file.name}`;
  await getStorageAdapter().put(key, bytes, file.type || "application/octet-stream");

  await prisma.organizationDocument.create({
    data: {
      orgId: access.membership.organizationId,
      category: "ATTENDANCE_REGISTER",
      fileKey: key,
      notes: `Uploaded by ${access.user.email}`,
      status: "APPROVED"
    }
  });

  return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/registers`, req.url));
}
