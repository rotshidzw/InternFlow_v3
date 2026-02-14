import { otpRequestSchema } from "@internflow/shared/src/schemas";
import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { sendOtpEmail } from "@/lib/mailer";

function generateOtp() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = otpRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const code = generateOtp();
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  const mailResult = await sendOtpEmail(parsed.data.email, code);

  await prisma.auditLog.create({
    data: {
      userId: user?.id,
      action: "LOGIN_OTP_REQUESTED",
      metadata: {
        email: parsed.data.email,
        mailDelivered: mailResult.delivered,
        devFallbackLogged: mailResult.fallbackLogged
      }
    }
  });

  return NextResponse.json({ ok: true, message: "OTP request accepted" }, { status: 200 });
}
