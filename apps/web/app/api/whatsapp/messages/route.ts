import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStorageAdapter } from "@internflow/shared/src/storage";
import { Queue } from "bullmq";
import { createRedisClient } from "@/lib/redis-queue";
import { generateChatbotAssistance } from "@/lib/openrouter-ai";
import {
  applyCertificateReleaseTransitionsWithAudit,
  loadOrganizationCertificateRecords,
} from "@/lib/provider-operations";

type Intent =
  | "status"
  | "upload"
  | "payslip"
  | "certificate"
  | "support"
  | "unknown";

const redisConnection = createRedisClient("api-whatsapp");
const scanQueue = new Queue("document-scan", { connection: redisConnection });

const expiryByType: Record<string, number | null> = {
  ID: 3650,
  CV: null,
  CERTIFICATE: 90,
  AFFIDAVIT: 90,
  PROOF_OF_ADDRESS: 90,
  PAYSLIP: 30,
  APPLICATION_SUPPORTING_DOC: null,
};

function computeExpiration(type: string) {
  const days = expiryByType[type];
  if (!days) return null;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function resolveIntent(body: string): Intent {
  const text = body.trim().toLowerCase();
  if (["1", "status"].includes(text)) return "status";
  if (["2", "upload"].includes(text)) return "upload";
  if (["3", "payslip"].includes(text)) return "payslip";
  if (["4", "certificate"].includes(text)) return "certificate";
  if (["5", "support"].includes(text)) return "support";
  return "unknown";
}

export async function GET(req: Request) {
  return NextResponse.redirect(new URL("/app/whatsapp-sim", req.url));
}

export async function POST(req: Request) {
  try {
    const email = cookies().get("if_user")?.value;
    if (!email) return NextResponse.redirect(new URL("/auth", req.url));

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.redirect(new URL("/auth", req.url));

    const platformMembership = await prisma.platformMembership.findFirst({
      where: { userId: user.id },
    });
    if (platformMembership)
      return NextResponse.redirect(new URL("/hq/dashboard", req.url));

    const formData = await req.formData();
    const threadId = String(formData.get("threadId") ?? "");
    const body = String(formData.get("body") ?? "").trim();

    const thread = await prisma.chatThread.findFirst({
      where: { id: threadId, userId: user.id },
    });
    if (!thread)
      return NextResponse.redirect(new URL("/app/whatsapp-sim", req.url));

    const [userMembership, activeEnrollment, latestApplication] =
      await Promise.all([
        prisma.membership.findFirst({
          where: { userId: thread.userId },
          include: { organization: true },
        }),
        prisma.enrollment.findFirst({
          where: {
            userId: thread.userId,
            status: { in: ["PENDING", "ACTIVE", "COMPLETED"] },
          },
          include: { program: true, organization: true },
          orderBy: { id: "desc" },
        }),
        prisma.application.findFirst({
          where: { userId: thread.userId },
          include: { opportunity: true, checklist: true },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    await prisma.chatMessage.create({
      data: { threadId: thread.id, role: "USER", body: body || "(empty)" },
    });

    const file = formData.get("file");
    const wantsUpload = body.toLowerCase() === "upload" && file instanceof File;

    if (wantsUpload) {
      const docType = String(
        formData.get("docType") ?? "APPLICATION_SUPPORTING_DOC",
      );
      const storage = getStorageAdapter();
      const fileName = file.name || "whatsapp-upload.bin";
      const mimeType = file.type || "application/octet-stream";
      const bytes = Buffer.from(await file.arrayBuffer());
      const storageKey = `uploads/${user.id}/${Date.now()}-${fileName}`;

      await storage.put(storageKey, bytes, mimeType);

      const document = await prisma.document.create({
        data: {
          userId: user.id,
          type: docType,
          status: "SCAN_PENDING",
          expirationDate: computeExpiration(docType),
          versions: {
            create: {
              storageKey,
              mimeType,
              sizeBytes: file.size,
            },
          },
        },
      });

      try {
        await scanQueue.add("scanDocument", {
          documentId: document.id,
          mimeType,
          sizeBytes: file.size,
          fileName,
        });
      } catch (error) {
        await prisma.document.update({
          where: { id: document.id },
          data: {
            status: "SUBMITTED",
            rejectionReason: "Scan queue unavailable; manual review required.",
          },
        });
        await prisma.chatMessage.create({
          data: {
            threadId: thread.id,
            role: "SYSTEM",
            body: "⚠️ Scan queue is unavailable right now. Your upload is saved and queued for manual review.",
          },
        });
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "WHATSAPP_SCAN_QUEUE_FAILED",
            metadata: {
              documentId: document.id,
              error:
                error instanceof Error ? error.message : "Unknown queue error",
            },
          },
        });
      }

      await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          role: "SYSTEM",
          body:
            docType === "CV"
              ? `Your CV was uploaded successfully. We are reading your CV now. Next step: parsing and verification review.`
              : `Your ${docType} was uploaded successfully. OCR/scan started. Next step: parsing and verification review.`,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "WHATSAPP_DOCUMENT_UPLOADED",
          metadata: { documentId: document.id, docType, fileName, mimeType },
        },
      });

      return NextResponse.redirect(new URL("/app/whatsapp-sim", req.url));
    }

    const intent = resolveIntent(body);
    let autoReply = "Thanks. A coordinator will respond soon.";

    if (intent === "status") {
      if (activeEnrollment) {
        autoReply = `Programme status: ${activeEnrollment.program.name} is currently ${activeEnrollment.status}. Organization: ${activeEnrollment.organization.name}.`;
      } else if (latestApplication) {
        autoReply = `Application status: ${latestApplication.status} for ${latestApplication.opportunity.title}. Keep your profile and documents updated.`;
      } else {
        autoReply =
          "You are not enrolled yet. Complete your profile, upload required documents, and apply for your first opportunity.";
      }
    }

    if (intent === "payslip") {
      const latestPayslip = await prisma.document.findFirst({
        where: { userId: thread.userId, type: "PAYSLIP" },
        orderBy: { createdAt: "desc" },
      });

      if (latestPayslip) {
        autoReply = `Your latest payslip is on file (status: ${latestPayslip.status}). You can download it from your document vault once approved.`;
      } else {
        autoReply =
          "Payslip request recorded. We will generate it from your active programme records and notify you once available.";
        const ticket = await prisma.ticket.create({
          data: {
            userId: thread.userId,
            createdByUserId: thread.userId,
            orgId: userMembership?.organizationId ?? null,
            title: "Payslip request",
            summary: "Learner requested a payslip from WhatsApp simulator.",
          },
        });
        await prisma.ticketEvent.create({
          data: {
            ticketId: ticket.id,
            type: "CREATED",
            event: "Payslip request from WhatsApp simulator",
            payload: { source: "whatsapp", userId: thread.userId },
          },
        });
      }
    }

    if (intent === "certificate") {
      if (
        activeEnrollment?.status === "COMPLETED" &&
        userMembership?.organization.slug
      ) {
        await applyCertificateReleaseTransitionsWithAudit({
          organizationId: activeEnrollment.organizationId,
          actorUserId: user.id,
        });

        const certificateRecords = await loadOrganizationCertificateRecords(
          activeEnrollment.organizationId,
        );
        const certificateRecord = certificateRecords.find(
          (record) =>
            record.enrollmentId === activeEnrollment.id &&
            record.userId === thread.userId,
        );

        if (!certificateRecord?.documentId) {
          autoReply =
            "Programme completed. Your certificate is not issued yet. The provider/coordinator must issue it first.";
        } else if (certificateRecord.status !== "RELEASED") {
          autoReply = `Certificate issued, but delayed-release policy is active. Available from ${certificateRecord.releaseAt.slice(0, 10)}.`;
        } else {
          autoReply = `Certificate available now. Download here: /api/org/${userMembership.organization.slug}/certificates/${certificateRecord.documentId}/download`;
        }
      } else {
        autoReply =
          "Certificate is locked until your programme is marked COMPLETED. Continue checklist, attendance, and assessments.";
      }
    }

    if (intent === "support") {
      autoReply =
        "Support ticket opened. A coordinator will follow up in this chat thread.";
      const ticket = await prisma.ticket.create({
        data: {
          userId: thread.userId,
          createdByUserId: thread.userId,
          orgId: userMembership?.organizationId ?? null,
          title: "WhatsApp support request",
          summary: autoReply,
        },
      });
      await prisma.ticketEvent.createMany({
        data: [
          {
            ticketId: ticket.id,
            type: "CREATED",
            event: "Created from WhatsApp simulator",
            payload: { source: "whatsapp" },
          },
          {
            ticketId: ticket.id,
            type: "TIMELINE",
            event: `Conversation thread: ${thread.id}`,
            payload: { threadId: thread.id },
          },
        ],
      });
    }

    if (intent === "upload") {
      autoReply =
        "Please use the Documents page to upload files. It shows required documents, processing status, and any re-upload actions clearly.";
    }


    if (intent === "unknown" && body) {
      const recentHistory = await prisma.chatMessage.findMany({
        where: { threadId: thread.id },
        orderBy: { createdAt: "desc" },
        take: 6,
      });

      const aiReply = await generateChatbotAssistance({
        userId: user.id,
        message: body,
        history: recentHistory
          .reverse()
          .map((msg) => ({
            role: msg.role === "USER" ? "user" : "assistant",
            content: msg.body,
          })),
      });

      autoReply = aiReply.reply;
    }

    await prisma.chatMessage.create({
      data: { threadId: thread.id, role: "SYSTEM", body: autoReply },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "WHATSAPP_INTENT",
        metadata: { intent, body },
      },
    });

    return NextResponse.redirect(new URL("/app/whatsapp-sim", req.url));
  } catch (error) {
    console.error("[whatsapp.messages]", error);
    return NextResponse.redirect(
      new URL("/app/whatsapp-sim?error=message-failed", req.url),
    );
  }
}
