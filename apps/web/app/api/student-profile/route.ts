import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendPlatformEmail } from "@/lib/mailer";
import { runProfileAiEnrichment } from "@/lib/openrouter-ai";
import {
  getAuthenticatedEmailFromCookies,
  setAuthenticatedSessionCookies,
} from "@/lib/auth-session";

const schema = z.object({
  email: z.string().email().optional(),
  inviteToken: z.string().min(6).optional(),
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

export async function GET() {
  const cookieEmail = getAuthenticatedEmailFromCookies();
  if (!cookieEmail) {
    return NextResponse.json(
      { ok: false, error: "Login required." },
      { status: 401 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: cookieEmail },
    include: { profile: true, studentProfile: true },
  });

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "User not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      email: user.email,
      fullName: user.studentProfile?.fullName ?? user.name ?? "",
      phone: user.studentProfile?.phone ?? user.profile?.phone ?? "",
      location: user.studentProfile?.location ?? "",
      bio: user.studentProfile?.bio ?? "",
      skills: user.studentProfile?.skills ?? [],
      education: user.studentProfile?.education ?? null,
      experience: user.studentProfile?.experience ?? null,
      emergencyContact: user.profile?.emergencyContact ?? "",
    },
  });
}

export async function POST(req: Request) {
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

  const cookieEmail = getAuthenticatedEmailFromCookies();
  const sourceEmail = cookieEmail ?? body.data.email;
  if (!sourceEmail) {
    return NextResponse.json(
      { ok: false, error: "Email required. Add email to continue onboarding." },
      { status: 400 },
    );
  }

  const normalizedEmail = sourceEmail.toLowerCase();

  let inviteTokenRecord: {
    id: string;
    token: string;
    tenantId: string;
    programmeId: string | null;
    usedCount: number;
    maxUses: number;
    expiresAt: Date;
    tenant: { slug: string };
  } | null = null;

  if (body.data.inviteToken) {
    inviteTokenRecord = await prisma.inviteToken.findUnique({
      where: { token: body.data.inviteToken },
      include: { tenant: true },
    });

    if (!inviteTokenRecord) {
      return NextResponse.json(
        { ok: false, error: "Invite token not found." },
        { status: 404 },
      );
    }

    if (inviteTokenRecord.expiresAt < new Date()) {
      return NextResponse.json(
        { ok: false, error: "Invite token expired." },
        { status: 400 },
      );
    }

    if (inviteTokenRecord.usedCount >= inviteTokenRecord.maxUses) {
      return NextResponse.json(
        { ok: false, error: "Invite token max uses reached." },
        { status: 400 },
      );
    }
  }

  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  let userWasAutoCreated = false;

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        role: "STUDENT",
        name: body.data.fullName,
      },
    });
    userWasAutoCreated = true;

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "STUDENT_ACCOUNT_AUTO_CREATED",
        metadata: {
          source: "student_profile_post",
          email: normalizedEmail,
        },
      },
    });

    const loginLink = `${new URL(req.url).origin}/auth/login`;
    await sendPlatformEmail(
      normalizedEmail,
      "Your InternFlow student account is ready",
      `We created your student account from your onboarding profile. Sign in here anytime: ${loginLink}.`,
    );
  }

  const existing = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
  });

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
    ...(typeof body.data.education === "object" && body.data.education
      ? body.data.education
      : {}),
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
    ...(typeof body.data.experience === "object" && body.data.experience
      ? body.data.experience
      : {}),
  };

  const location =
    body.data.location ||
    [body.data.city, body.data.province].filter(Boolean).join(", ");

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

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      phone: body.data.phone,
      education:
        typeof body.data.education === "string"
          ? body.data.education
          : body.data.highestQualification || body.data.institutionName || null,
      emergencyContact:
        body.data.emergencyContactName && body.data.emergencyContactPhone
          ? `${body.data.emergencyContactName} (${body.data.emergencyContactPhone})`
          : body.data.emergencyContactName ||
            body.data.emergencyContactPhone ||
            null,
    },
    create: {
      userId: user.id,
      phone: body.data.phone,
      education:
        typeof body.data.education === "string"
          ? body.data.education
          : body.data.highestQualification || body.data.institutionName || null,
      emergencyContact:
        body.data.emergencyContactName && body.data.emergencyContactPhone
          ? `${body.data.emergencyContactName} (${body.data.emergencyContactPhone})`
          : body.data.emergencyContactName ||
            body.data.emergencyContactPhone ||
            null,
    },
  });

  let redirectTo = "/app/student/profile";
  let workspaceSlug: string | undefined;

  if (inviteTokenRecord) {
    const existingMembership = await prisma.membership.findFirst({
      where: { userId: user.id, organizationId: inviteTokenRecord.tenantId },
    });

    if (existingMembership && existingMembership.role !== "STUDENT") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This invite is for students only. Use workspace login for staff access.",
        },
        { status: 409 },
      );
    }

    await prisma.$transaction(async (tx) => {
      if (!existingMembership) {
        await tx.membership.create({
          data: {
            userId: user.id,
            organizationId: inviteTokenRecord!.tenantId,
            role: "STUDENT",
          },
        });
      }

      if (inviteTokenRecord?.programmeId) {
        const enrollment = await tx.enrollment.findFirst({
          where: { userId: user.id, programId: inviteTokenRecord.programmeId },
        });

        if (enrollment) {
          await tx.enrollment.update({
            where: { id: enrollment.id },
            data: { organizationId: inviteTokenRecord.tenantId },
          });
        } else {
          await tx.enrollment.create({
            data: {
              userId: user.id,
              organizationId: inviteTokenRecord.tenantId,
              programId: inviteTokenRecord.programmeId,
              status: "PENDING",
            },
          });
        }
      }

      await tx.inviteToken.update({
        where: { id: inviteTokenRecord!.id },
        data: { usedCount: { increment: 1 } },
      });

      await tx.auditEvent.create({
        data: {
          tenantId: inviteTokenRecord!.tenantId,
          userId: user.id,
          action: "INVITE_JOIN_SUCCESS",
          entityType: "InviteToken",
          entityId: inviteTokenRecord!.id,
          metadata: { source: "profile_onboarding" },
        },
      });
    });

    workspaceSlug = inviteTokenRecord.tenant.slug;
    redirectTo = `/org/${inviteTokenRecord.tenant.slug}/student`;
  }

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
        hasIdNumber: Boolean(
          (profile.education as Record<string, unknown> | null)?.idNumber,
        ),
        hasCvUrl: Boolean(
          (profile.experience as Record<string, unknown> | null)?.cvUrl,
        ),
        hasEmergencyContact: Boolean(
          body.data.emergencyContactName && body.data.emergencyContactPhone,
        ),
        joinedViaInvite: Boolean(inviteTokenRecord),
      },
    },
  });

  const enrichmentInput = [
    body.data.fullName,
    body.data.bio,
    body.data.skills.join(", "),
    body.data.highestQualification,
    body.data.institutionName,
    body.data.fieldOfStudy,
    body.data.employmentStatus,
    body.data.currentEmployer,
    body.data.jobTitle,
    body.data.cvUrl,
  ]
    .filter(Boolean)
    .join("\n");

  void runProfileAiEnrichment({
    userId: user.id,
    studentProfileId: profile.id,
    cvText: enrichmentInput,
  }).catch((error) => {
    console.error("[ai] failed AI enrichment", {
      feature: "student_profile_save",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    console.warn("[ai] fallback used", { feature: "student_profile_save" });
  });

  const response = NextResponse.json({
    ok: true,
    profileId: profile.id,
    redirectTo,
    autoCreatedUser: userWasAutoCreated,
    joinedViaInvite: Boolean(inviteTokenRecord),
  });

  setAuthenticatedSessionCookies(response, normalizedEmail);

  if (workspaceSlug) {
    response.cookies.set("if_workspace", workspaceSlug, {
      sameSite: "lax",
      path: "/",
    });
  }

  return response;
}
