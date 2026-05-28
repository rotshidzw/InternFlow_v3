import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@internflow/db/src";
import { setAuthenticatedSessionCookies } from "@/lib/auth-session";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const payload = schema.safeParse(await req.json());
  if (!payload.success)
    return NextResponse.json({ ok: false }, { status: 400 });

  const email = payload.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  const platformMembership = user
    ? await prisma.platformMembership.findFirst({ where: { userId: user.id } })
    : null;
  const memberships = user
    ? await prisma.membership.findMany({
        where: { userId: user.id },
        include: { organization: true },
      })
    : [];
  const single = memberships.length === 1 ? memberships[0] : null;
  const rememberedWorkspace = cookies().get("if_workspace")?.value;
  let rememberedMembership: (typeof memberships)[number] | null = null;
  if (rememberedWorkspace) {
    for (const membership of memberships) {
      if (membership.organization.slug === rememberedWorkspace) {
        rememberedMembership = membership;
        break;
      }
    }
  }

  const redirectTo = !user
    ? "/onboarding/profile"
    : platformMembership
      ? "/hq/dashboard"
      : single
        ? single.role === "STUDENT"
          ? "/app/student"
          : `/org/${single.organization.slug}/app`
        : rememberedMembership
          ? rememberedMembership.role === "STUDENT"
            ? "/app/student"
            : `/org/${rememberedMembership.organization.slug}/app`
          : memberships.length === 0
            ? "/onboarding/profile"
            : "/workspaces";

  const res = NextResponse.json({ ok: true, redirectTo });
  setAuthenticatedSessionCookies(res, email);
  if (single)
    res.cookies.set("if_workspace", single.organization.slug, {
      sameSite: "lax",
      path: "/",
    });
  return res;
}
