import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformApiUserWithRole } from "@/lib/hq/api-auth";

const schema = z.object({ action: z.enum(["APPROVED", "REJECTED"]), notes: z.string().optional() });

export async function POST(req: Request, { params }: { params: { orgId: string } }) {
  const actor = await requirePlatformApiUserWithRole(["PLATFORM_ADMIN"]);
  if (!actor) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const ct=req.headers.get("content-type")??"";
  const payload = ct.includes("application/json") ? await req.json() : Object.fromEntries(await req.formData());
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  await prisma.organization.update({
    where: { id: params.orgId },
    data: {
      status: parsed.data.action,
      rejectionReason: parsed.data.action === "REJECTED" ? parsed.data.notes ?? "Rejected by platform admin" : null
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: actor.user.id,
      orgId: params.orgId,
      action: `ORG_STATUS_${parsed.data.action}`,
      metadata: { notes: parsed.data.notes ?? null },
    },
  });

  if (!ct.includes("application/json")) {
    return NextResponse.redirect(new URL("/platform-admin", req.url));
  }

  return NextResponse.json({ ok: true });
}
