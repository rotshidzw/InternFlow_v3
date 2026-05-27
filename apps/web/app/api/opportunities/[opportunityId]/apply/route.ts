import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { getStorageAdapter } from "@internflow/shared/src/storage";
import { cookies } from "next/headers";

const ACTIVE_ENROLLMENT_STATUSES = ["PENDING", "ACTIVE"] as const;

export async function POST(
  req: Request,
  { params }: { params: { opportunityId: string } },
) {
  try {
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
        status: { in: [...ACTIVE_ENROLLMENT_STATUSES] },
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
    const intent = String(form.get("intent") ?? "submit")
      .trim()
      .toLowerCase();
    const saveAsDraft = intent === "draft";
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

    if (skills.length > 0 && studentProfileDelegate) {
      const studentProfile = await studentProfileDelegate.findUnique({
        where: { userId: actor.id },
      });
      await studentProfileDelegate.upsert({
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

    const existing = await prisma.application.findFirst({
      where: {
        userId: actor.id,
        opportunityId: params.opportunityId,
        status: { not: "REJECTED" },
      },
      select: { id: true, status: true },
    });

    let application = existing;
    if (existing) {
      if (saveAsDraft) {
        if (existing.status !== "DRAFT") {
          return NextResponse.redirect(
            new URL("/app/student?notice=already-applied", req.url),
          );
        }
      } else {
        if (existing.status !== "DRAFT") {
          return NextResponse.redirect(
            new URL("/app/student?notice=already-applied", req.url),
          );
        }
      }
      application = await prisma.application.update({
        where: { id: existing.id },
        data: {
          status: saveAsDraft ? "DRAFT" : "SUBMITTED",
          submittedAt: saveAsDraft ? null : new Date(),
        },
        select: { id: true, status: true },
      });
    } else {
      application = await prisma.application.create({
        data: {
          userId: actor.id,
          opportunityId: params.opportunityId,
          status: saveAsDraft ? "DRAFT" : "SUBMITTED",
          submittedAt: saveAsDraft ? null : new Date(),
        },
        select: { id: true, status: true },
      });
    }

    if (!application) {
      return NextResponse.redirect(
        new URL("/app/student?error=apply-failed", req.url),
      );
    }

    let uploadFailed = false;

    if (file instanceof File) {
      try {
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
      } catch (error) {
        uploadFailed = true;
        await prisma.auditLog.create({
          data: {
            userId: actor.id,
            action: "APPLICATION_CV_UPLOAD_FAILED",
            metadata: {
              opportunityId: params.opportunityId,
              error: error instanceof Error ? error.message : "unknown",
            },
          },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        action: saveAsDraft ? "APPLICATION_DRAFT_SAVED" : "APPLICATION_SUBMITTED",
        metadata: { applicationId: application.id, intent: saveAsDraft ? "draft" : "submit" },
      },
    });

    if (uploadFailed) {
      const referer = req.headers.get("referer");
      if (referer) {
        const url = new URL(referer);
        url.searchParams.set("warning", "cv-upload-failed");
        return NextResponse.redirect(url);
      }
    }

    return NextResponse.redirect(
      new URL(
        saveAsDraft ? "/app/student?notice=draft-saved" : "/app/student?applied=1",
        req.url,
      ),
    );
  } catch (error) {
    console.error("[opportunity.apply]", error);
    const referer = req.headers.get("referer");
    if (referer) {
      const url = new URL(referer);
      url.searchParams.set("error", "apply-failed");
      return NextResponse.redirect(url);
    }
    return NextResponse.redirect(
      new URL("/app/student?error=apply-failed", req.url),
    );
  }
}
