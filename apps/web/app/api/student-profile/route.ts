import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  fullName: z.string().min(2),
  phone: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
  skills: z.array(z.string()).default([]),
  education: z.any().optional(),
  experience: z.any().optional(),
  isDiscoverable: z.boolean().default(false),
});

export async function POST(req: Request) {
  const email = cookies().get("if_user")?.value;
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

  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid profile data",
        details: body.error.flatten(),
      },
      { status: 400 },
    );
  }

  const existing = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
  });

  const profile = await prisma.studentProfile.upsert({
    where: { userId: user.id },
    update: {
      fullName: body.data.fullName,
      phone: body.data.phone,
      location: body.data.location,
      bio: body.data.bio,
      skills: body.data.skills,
      education: body.data.education,
      experience: body.data.experience,
      isDiscoverable: body.data.isDiscoverable,
    },
    create: {
      userId: user.id,
      fullName: body.data.fullName,
      phone: body.data.phone,
      location: body.data.location,
      bio: body.data.bio,
      skills: body.data.skills,
      education: body.data.education,
      experience: body.data.experience,
      isDiscoverable: body.data.isDiscoverable,
    },
  });

  await prisma.auditEvent.create({
    data: {
      userId: user.id,
      action: existing ? "STUDENT_PROFILE_UPDATED" : "STUDENT_PROFILE_CREATED",
      entityType: "StudentProfile",
      entityId: profile.id,
      metadata: {
        isDiscoverable: profile.isDiscoverable,
        skillsCount: profile.skills.length,
      },
    },
  });

  return NextResponse.json({
    ok: true,
    profileId: profile.id,
    redirectTo: "/explore",
  });
}
