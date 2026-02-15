import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@internflow/db/src";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const payload = schema.safeParse(await req.json());
  if (!payload.success) return NextResponse.json({ ok: false }, { status: 400 });

  const email = payload.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  const platformMembership = user ? await prisma.platformMembership.findFirst({ where: { userId: user.id } }) : null;
  const memberships = user ? await prisma.membership.findMany({ where: { userId: user.id }, include: { organization: true } }) : [];
  const single = memberships.length === 1 ? memberships[0] : null;

  const redirectTo = !user
    ? "/onboarding"
    : platformMembership
      ? "/hq/dashboard"
      : single
        ? `/org/${single.organization.slug}/home`
        : memberships.length === 0
          ? "/onboarding"
          : "/workspaces";

  const res = NextResponse.json({ ok: true, redirectTo });
  res.cookies.set("if_user", email, { httpOnly: true, sameSite: "lax", path: "/" });
  if (single) res.cookies.set("if_workspace", single.organization.slug, { sameSite: "lax", path: "/" });
  return res;
}
