import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { getStorageAdapter } from "@internflow/shared/src/storage";
import { cookies } from "next/headers";

const ACTIVE_ENROLLMENT_STATUSES = ["PENDING", "ACTIVE"] as const;

export async function POST(
  req: Request,
  { params }: { params: { opportunityId: string } },
) {
  const sessionEmail = cookies().get("if_user")?.value;
  if (!sessionEmail) return NextResponse.redirect(new URL("/auth", req.url));

  const actor = await prisma.user.findUnique({
    where: { email: sessionEmail },
  });
  if (!actor) return NextResponse.redirect(new URL("/auth", req.url));

  const opportunity = await prisma.opportunity.findUnique({
    where: { id: params.opportunityId },
    select: { id: true, organizationId: true, status: true },
  });
  if (!opportunity || opportunity.status !== "PUBLISHED") {
    return NextResponse.redirect(
      new URL("/app/student?error=invalid-opportunity", req.url),
    );
  }

  const activeEnrollment = await prisma.enrollment.findFirst({
    where: {
      userId: actor.id,
      status: { in: ACTIVE_ENROLLMENT_STATUSES as unknown as string[] },
    },
    select: { id: true, organizationId: true },
  });

  if (
    activeEnrollment &&
    activeEnrollment.organizationId !== opportunity.organizationId
  ) {
    return NextResponse.redirect(
      new URL("/app/student?error=active-enrollment", req.url),
    );
  }

  const existing = await prisma.application.findFirst({
    where: {
      userId: actor.id,
      opportunityId: params.opportunityId,
      status: { not: "REJECTED" },
    },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.redirect(
      new URL("/app/student?notice=already-applied", req.url),
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const phone = String(form.get("phone") ?? "").trim();
  const education = String(form.get("education") ?? "").trim();
  const skills = String(form.get("skills") ?? "")
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);

  if (phone || education) {
    await prisma.profile.upsert({
      where: { userId: actor.id },
      update: {
        ...(phone ? { phone } : {}),
        ...(education ? { education } : {}),
      },
      create: {
        userId: actor.id,
        phone: phone || null,
        education: education || null,
      },
    });
  }

  if (skills.length > 0) {
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: actor.id },
    });
    await prisma.studentProfile.upsert({
      where: { userId: actor.id },
      update: {
        skills: Array.from(
          new Set([...(studentProfile?.skills ?? []), ...skills]),
        ),
      },
      create: {
        userId: actor.id,
        fullName: actor.name ?? actor.email,
        phone: phone || null,
        skills,
      },
    });
  }

  const application = await prisma.application.create({
    data: {
      userId: actor.id,
      opportunityId: params.opportunityId,
      status: "APPLIED",
      submittedAt: new Date(),
    },
  });

  if (file instanceof File) {
    const key = `applications/${actor.id}/${Date.now()}-${file.name}`;
    await getStorageAdapter().put(
      key,
      Buffer.from(await file.arrayBuffer()),
      file.type || "application/octet-stream",
    );
    await prisma.document.create({
      data: {
        userId: actor.id,
        type: "APPLICATION_SUPPORTING_DOC",
        status: "SUBMITTED",
        versions: {
          create: {
            storageKey: key,
            mimeType: file.type || "application/octet-stream",
            sizeBytes: file.size,
          },
        },
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: "APPLICATION_SUBMITTED",
      metadata: { applicationId: application.id },
    },
  });

  return NextResponse.redirect(new URL("/app/student?applied=1", req.url));
}
