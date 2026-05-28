import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/auth", req.url));

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, organization: { slug: params.slug } },
    include: { organization: true }
  });

  if (!membership) return NextResponse.redirect(new URL("/workspaces", req.url));

  const target = membership.organization.status !== "APPROVED"
    ? "/onboarding/verify-org"
    : membership.role === "STUDENT"
      ? "/app/student"
      : `/org/${params.slug}/app`;

  const response = NextResponse.redirect(new URL(target, req.url));
  response.cookies.set("if_workspace", params.slug, { path: "/", sameSite: "lax" });
  return response;
}
