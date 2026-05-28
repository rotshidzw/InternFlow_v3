import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyOtp } from "@/lib/otp-store";
import { z } from "zod";
import { setAuthenticatedSessionCookies } from "@/lib/auth-session";

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().min(6).max(6),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid input" },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const check = await verifyOtp(email, parsed.data.code);
  if (!check.ok) {
    return NextResponse.json(
      { ok: false, error: check.reason },
      { status: 401 },
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });

  await prisma.auditLog.create({
    data: {
      userId: user?.id,
      action: "LOGIN_OTP_VERIFIED",
      metadata: {
        email,
        role: user?.role ?? "UNKNOWN",
      },
    },
  });

  const platformMembership = user
    ? await prisma.platformMembership.findFirst({ where: { userId: user.id } })
    : null;
  const memberships = user
    ? await prisma.membership.findMany({
        where: { userId: user.id },
        include: { organization: true },
      })
    : [];
  const singleMembership = memberships.length === 1 ? memberships[0] : null;
  const hasStudentProfile = user
    ? Boolean(await prisma.studentProfile.findUnique({ where: { userId: user.id }, select: { id: true } }))
    : false;
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
  let redirectTo = "/onboarding/profile";
  if (!user) {
    redirectTo = "/onboarding/profile";
  } else if (platformMembership) {
    redirectTo = "/hq/dashboard";
  } else if (memberships.length === 0) {
    redirectTo = user.role === "STUDENT" && hasStudentProfile ? "/explore" : "/onboarding/profile";
  } else if (singleMembership) {
    redirectTo = singleMembership.role === "STUDENT" ? "/app/student" : `/org/${singleMembership.organization.slug}/app`;
  } else if (rememberedMembership) {
    redirectTo = rememberedMembership.role === "STUDENT" ? "/app/student" : `/org/${rememberedMembership.organization.slug}/app`;
  } else {
    redirectTo = "/workspaces";
  }

  const response = NextResponse.json({
    ok: true,
    redirectTo,
    hasAccount: Boolean(user),
    requiresOrgSetup: !user,
  });

  setAuthenticatedSessionCookies(response, email);
  if (singleMembership) {
    response.cookies.set("if_workspace", singleMembership.organization.slug, {
      sameSite: "lax",
      path: "/",
    });
  }

  return response;
}
