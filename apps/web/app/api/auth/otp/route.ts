import { otpRequestSchema } from "@internflow/shared/src/schemas";
import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { sendOtpEmail } from "@/lib/mailer";
import { saveOtp } from "@/lib/otp-store";

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
  const body = await req.json();
  const parsed = otpRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const code = generateOtp();
  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  saveOtp(email, code);

  const mailResult = await withTimeout(
    sendOtpEmail(email, code),
    12_000,
    { delivered: false, fallbackLogged: false },
  );

  await prisma.auditLog.create({
    data: {
      userId: user?.id,
      action: "LOGIN_OTP_REQUESTED",
      metadata: {
        email,
        mailDelivered: mailResult.delivered,
        devFallbackLogged: mailResult.fallbackLogged
      }
    }
  });

  return NextResponse.json({ ok: true, message: "OTP sent", nextStep: "verify_otp" }, { status: 200 });
}
