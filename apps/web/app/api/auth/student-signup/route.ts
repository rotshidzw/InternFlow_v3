import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendOtpEmail } from "@/lib/mailer";
import { saveOtp } from "@/lib/otp-store";

const studentSignupSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(160),
  email: z.string().trim().email("Valid email is required").max(180),
});

function generateOtp() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
) {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = studentSignupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid signup payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const fullName = parsed.data.fullName.trim();
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser && existingUser.role !== "STUDENT") {
    await prisma.auditLog.create({
      data: {
        userId: existingUser.id,
        action: "STUDENT_SIGNUP_BLOCKED_NON_STUDENT_ACCOUNT",
        metadata: { email, role: existingUser.role },
      },
    });

    return NextResponse.json(
      {
        ok: false,
        error: "This email is already linked to an existing staff account. Please sign in instead.",
        signInPath: "/auth/login",
      },
      { status: 409 },
    );
  }

  if (existingUser) {
    await prisma.auditLog.create({
      data: {
        userId: existingUser.id,
        action: "STUDENT_SIGNUP_ATTEMPT_EXISTING",
        metadata: { email },
      },
    });

    return NextResponse.json(
      {
        ok: false,
        error: "A student account for this email already exists. Please sign in.",
        signInPath: "/auth/login",
      },
      { status: 409 },
    );
  }

  const user = await prisma.user.create({
    data: {
      email,
      role: "STUDENT",
      name: fullName,
    },
  });

  const code = generateOtp();
  await saveOtp(email, code);
  const mailResult = await withTimeout(
    sendOtpEmail(email, code),
    12_000,
    { delivered: false, fallbackLogged: false },
  );

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "STUDENT_SIGNUP_INITIATED",
      metadata: {
        email,
        mailDelivered: mailResult.delivered,
        devFallbackLogged: mailResult.fallbackLogged,
      },
    },
  });

  return NextResponse.json({
    ok: true,
    email,
    nextStep: "verify_otp",
    redirectAfterVerify: "/onboarding/profile",
  });
}
