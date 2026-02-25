import { prisma } from "@internflow/db/src";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  fullName: z.string().min(2),
  phone: z.string().optional(),
  alternatePhone: z.string().optional(),
  location: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  bio: z.string().optional(),
  skills: z.array(z.string()).default([]),
  education: z.any().optional(),
  experience: z.any().optional(),
  idNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  citizenship: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  disabilityStatus: z.enum(["NONE", "YES", "PREFER_NOT_TO_SAY"]).optional(),
  disabilityDetails: z.string().optional(),
  highestQualification: z.string().optional(),
  institutionName: z.string().optional(),
  fieldOfStudy: z.string().optional(),
  graduationYear: z.string().optional(),
  employmentStatus: z.string().optional(),
  currentEmployer: z.string().optional(),
  jobTitle: z.string().optional(),
  yearsExperience: z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  portfolioUrl: z.string().url().optional().or(z.literal("")),
  cvUrl: z.string().url().optional().or(z.literal("")),
  preferredProgrammeType: z.string().optional(),
  availability: z.string().optional(),
  languages: z.array(z.string()).optional(),
  consentToShareProfile: z.boolean().default(false),
  isDiscoverable: z.boolean().default(false),
});

export async function POST(req: Request) {
  const email = cookies().get("if_user")?.value;
  if (!email) {
    return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }

  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid profile data", details: body.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.studentProfile.findUnique({ where: { userId: user.id } });

  const personalDetails = {
    idNumber: body.data.idNumber,
    dateOfBirth: body.data.dateOfBirth,
    gender: body.data.gender,
    citizenship: body.data.citizenship,
    disabilityStatus: body.data.disabilityStatus,
    disabilityDetails: body.data.disabilityDetails,
    alternatePhone: body.data.alternatePhone,
  };

  const addressDetails = {
    addressLine1: body.data.addressLine1,
    addressLine2: body.data.addressLine2,
    city: body.data.city,
    province: body.data.province,
    country: body.data.country,
    postalCode: body.data.postalCode,
  };

  const educationDetails = {
    highestQualification: body.data.highestQualification,
    institutionName: body.data.institutionName,
    fieldOfStudy: body.data.fieldOfStudy,
    graduationYear: body.data.graduationYear,
    languages: body.data.languages ?? [],
    ...personalDetails,
    addressDetails,
    ...(typeof body.data.education === "object" && body.data.education ? body.data.education : {}),
  };

  const experienceDetails = {
    employmentStatus: body.data.employmentStatus,
    currentEmployer: body.data.currentEmployer,
    jobTitle: body.data.jobTitle,
    yearsExperience: body.data.yearsExperience,
    cvUrl: body.data.cvUrl,
    linkedinUrl: body.data.linkedinUrl,
    portfolioUrl: body.data.portfolioUrl,
    preferredProgrammeType: body.data.preferredProgrammeType,
    availability: body.data.availability,
    emergencyContactName: body.data.emergencyContactName,
    emergencyContactPhone: body.data.emergencyContactPhone,
    ...(typeof body.data.experience === "object" && body.data.experience ? body.data.experience : {}),
  };

  const location = body.data.location || [body.data.city, body.data.province].filter(Boolean).join(", ");

  const profile = await prisma.studentProfile.upsert({
    where: { userId: user.id },
    update: {
      fullName: body.data.fullName,
      phone: body.data.phone,
      location,
      bio: body.data.bio,
      skills: body.data.skills,
      education: educationDetails,
      experience: experienceDetails,
      isDiscoverable: body.data.isDiscoverable,
    },
    create: {
      userId: user.id,
      fullName: body.data.fullName,
      phone: body.data.phone,
      location,
      bio: body.data.bio,
      skills: body.data.skills,
      education: educationDetails,
      experience: experienceDetails,
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
        consentToShareProfile: body.data.consentToShareProfile,
        skillsCount: profile.skills.length,
        hasIdNumber: Boolean((profile.education as Record<string, unknown> | null)?.idNumber),
        hasCvUrl: Boolean((profile.experience as Record<string, unknown> | null)?.cvUrl),
        hasEmergencyContact: Boolean(body.data.emergencyContactName && body.data.emergencyContactPhone),
      },
    },
  });

  return NextResponse.json({ ok: true, profileId: profile.id, redirectTo: "/explore" });
}
