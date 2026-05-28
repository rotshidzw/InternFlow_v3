import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { getAuthenticatedEmailFromCookies } from "@/lib/auth-session";

export async function GET() {
  const email = getAuthenticatedEmailFromCookies();
  if (!email)
    return NextResponse.json(
      { ok: false, error: "Unauthenticated" },
      { status: 401 },
    );

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user)
    return NextResponse.json(
      { ok: false, error: "User not found" },
      { status: 404 },
    );

  const posts = await prisma.opportunityPost.findMany({
    where: {
      visibility: "PUBLIC",
      OR: [{ closesAt: null }, { closesAt: { gt: new Date() } }],
    },
    include: { tenant: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ ok: true, posts });
}
