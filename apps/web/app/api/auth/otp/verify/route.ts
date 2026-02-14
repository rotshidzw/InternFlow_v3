import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp-store";
import { z } from "zod";

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().min(6).max(6)
});

const roleRoute: Record<string, string> = {
  STUDENT: "/app/student",
  PROVIDER_ADMIN: "/app/provider",
  COORDINATOR: "/app/coordinator",
  SUPERVISOR: "/app/supervisor",
  SYSTEM_ADMIN: "/demo"
};

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const check = verifyOtp(email, parsed.data.code);
  if (!check.ok) {
    return NextResponse.json({ ok: false, error: check.reason }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  await prisma.auditLog.create({
    data: {
      userId: user?.id,
      action: "LOGIN_OTP_VERIFIED",
      metadata: {
        email,
        role: user?.role ?? "UNKNOWN"
      }
    }
  });

  const redirectTo = user ? roleRoute[user.role] ?? "/demo" : "/auth/setup";

  return NextResponse.json({
    ok: true,
    redirectTo,
    hasAccount: Boolean(user),
    requiresOrgSetup: !user
  });
}
