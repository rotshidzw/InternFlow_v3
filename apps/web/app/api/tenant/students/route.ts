import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getApiUserFromCookie } from "@/lib/tenant-api-auth";

const ALLOWED_ROLES = new Set(["PROVIDER_ADMIN", "COORDINATOR", "SYSTEM_ADMIN"]);

export async function GET(req: Request) {
  const workspaceSlug = cookies().get("if_workspace")?.value;
  if (!workspaceSlug)
    return NextResponse.json(
      { ok: false, error: "Missing session" },
      { status: 401 },
    );

  const actor = await getApiUserFromCookie();
  if (!actor)
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );

  const membership = await prisma.membership.findFirst({
    where: {
      userId: actor.id,
      organization: { slug: workspaceSlug, status: "APPROVED" },
    },
  });
  if (!membership || !ALLOWED_ROLES.has(membership.role)) {
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(req.url);
  const skills = (searchParams.get("skills") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const location = (searchParams.get("location") ?? "").trim();
  const keyword = (searchParams.get("keyword") ?? "").trim();

  const profiles = await prisma.studentProfile.findMany({
    where: {
      isDiscoverable: true,
      ...(location
        ? { location: { contains: location, mode: "insensitive" } }
        : {}),
      ...(skills.length ? { skills: { hasSome: skills } } : {}),
      ...(keyword
        ? {
            OR: [
              { fullName: { contains: keyword, mode: "insensitive" } },
              { bio: { contains: keyword, mode: "insensitive" } },
              { skills: { has: keyword } },
            ],
          }
        : {}),
    },
    include: { user: true },
    take: 100,
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ ok: true, profiles });
}
