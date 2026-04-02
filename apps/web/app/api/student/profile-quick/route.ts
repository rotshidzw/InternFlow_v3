import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const email = cookies().get("if_user")?.value;
  if (!email) return NextResponse.redirect(new URL("/auth", req.url));

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user) return NextResponse.redirect(new URL("/auth", req.url));

  const studentProfileDelegate = (
    prisma as unknown as {
      studentProfile?: {
        findUnique: (args: {
          where: { userId: string };
        }) => Promise<{ skills: string[] } | null>;
        upsert: (args: {
          where: { userId: string };
          update: { skills: string[] };
          create: {
            userId: string;
            fullName: string;
            phone: string | null;
            skills: string[];
          };
        }) => Promise<unknown>;
      };
    }
  ).studentProfile;

  const form = await req.formData();
  const phone = String(form.get("phone") ?? "").trim();
  const education = String(form.get("education") ?? "").trim();
  const emergencyContact = String(form.get("emergencyContact") ?? "").trim();
  const skills = String(form.get("skills") ?? "")
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      ...(phone ? { phone } : {}),
      ...(education ? { education } : {}),
      ...(emergencyContact ? { emergencyContact } : {}),
    },
    create: {
      userId: user.id,
      phone: phone || null,
      education: education || null,
      emergencyContact: emergencyContact || null,
    },
  });

  if (skills.length > 0 && studentProfileDelegate) {
    const existing = await studentProfileDelegate.findUnique({
      where: { userId: user.id },
    });
    await studentProfileDelegate.upsert({
      where: { userId: user.id },
      update: {
        skills: Array.from(new Set([...(existing?.skills ?? []), ...skills])),
      },
      create: {
        userId: user.id,
        fullName: user.name ?? user.email,
        phone: phone || null,
        skills,
      },
    });
  }

  return NextResponse.redirect(
    new URL("/app/student?notice=profile-updated", req.url),
  );
}
