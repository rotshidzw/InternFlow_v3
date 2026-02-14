import { otpRequestSchema } from "@internflow/shared/src/schemas";
import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = otpRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  await prisma.auditLog.create({ data: { userId: user?.id, action: "LOGIN_OTP_REQUESTED", metadata: { email: parsed.data.email } } });
  return NextResponse.json({ ok: true, message: "OTP sent to Mailhog (simulated)." });
}
