import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUserFromCookie } from "@/lib/tenant-api-auth";

const schema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/i, "Invalid workspace slug"),
});

export async function POST(req: Request) {
  const ct = req.headers.get("content-type") ?? "";
  const payload = ct.includes("application/json") ? await req.json() : Object.fromEntries(await req.formData());
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid workspace slug" }, { status: 400 });

  const actor = await getApiUserFromCookie();
  if (!actor) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.membership.findFirst({
    where: {
      userId: actor.id,
      organization: { slug: parsed.data.slug },
    },
    include: { organization: true },
  });

  if (!membership) {
    console.warn("[workspaces-select] forbidden workspace selection", {
      actorUserId: actor.id,
      requestedSlug: parsed.data.slug,
    });
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const redirectTo =
    membership.organization.status !== "APPROVED"
      ? "/onboarding/verify-org"
      : membership.role === "STUDENT"
        ? "/app/student"
        : `/org/${membership.organization.slug}/app`;

  const res = NextResponse.json({
    ok: true,
    slug: membership.organization.slug,
    role: membership.role,
    organizationStatus: membership.organization.status,
    redirectTo,
  });
  res.cookies.set("if_workspace", membership.organization.slug, { path: "/", sameSite: "lax" });

  await prisma.auditEvent.create({
    data: {
      tenantId: membership.organizationId,
      userId: actor.id,
      action: "WORKSPACE_SELECTED",
      entityType: "Organization",
      entityId: membership.organizationId,
      metadata: {
        orgSlug: membership.organization.slug,
      },
    },
  });

  return res;
}
