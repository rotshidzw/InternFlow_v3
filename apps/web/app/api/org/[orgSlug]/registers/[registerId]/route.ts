import { prisma } from "@internflow/db/src";
import { getStorageAdapter } from "@internflow/shared/src/storage";
import { NextResponse } from "next/server";
import { getOrgAccess } from "@/lib/org-access";

export async function GET(_: Request, { params }: { params: { orgSlug: string; registerId: string } }) {
  const access = await getOrgAccess(params.orgSlug);
  if ("error" in access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const register = await prisma.organizationDocument.findFirst({
    where: { id: params.registerId, orgId: access.membership.organizationId, category: "ATTENDANCE_REGISTER" }
  });
  if (!register) return NextResponse.json({ error: "Register not found" }, { status: 404 });

  const bytes = await getStorageAdapter().getBuffer(register.fileKey);
  const fileName = register.fileKey.split("/").pop() ?? "register";
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename=\"${fileName}\"`
    }
  });
}
