import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const email = cookies().get("if_user")?.value;
  if (!email) return NextResponse.redirect(new URL("/auth", req.url));

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.redirect(new URL("/auth", req.url));

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, organization: { slug: params.slug } },
    include: { organization: true }
  });

  if (!membership) return NextResponse.redirect(new URL("/workspaces", req.url));

  const target = membership.organization.status === "APPROVED" ? `/org/${params.slug}/app` : "/onboarding/verify-org";

  const response = NextResponse.redirect(new URL(target, req.url));
  response.cookies.set("if_workspace", params.slug, { path: "/", sameSite: "lax" });
  return response;
}
