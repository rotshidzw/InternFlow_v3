import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { requirePlatformApiUser } from "@/lib/hq/api-auth";

export async function POST(req: Request, { params }: { params: { orgId: string } }) {
  const actor = await requirePlatformApiUser();
  if (!actor) return NextResponse.json({ ok: false }, { status: 403 });
  if (process.env.ENABLE_DEV_IMPERSONATION !== "true") {
    return NextResponse.redirect(new URL("/hq/tenants", req.url));
  }

  const org = await prisma.organization.findUnique({ where: { id: params.orgId } });
  if (!org) return NextResponse.redirect(new URL("/hq/tenants", req.url));

  const response = NextResponse.redirect(new URL(`/workspaces/open/${org.slug}`, req.url));
  response.cookies.set("if_impersonation", org.slug, { path: "/", sameSite: "lax" });
  return response;
}
