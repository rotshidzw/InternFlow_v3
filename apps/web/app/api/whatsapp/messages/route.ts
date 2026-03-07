import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStorageAdapter } from "@internflow/shared/src/storage";
import { Queue } from "bullmq";
import { createRedisClient } from "@/lib/redis-queue";

const quickReplies: Record<string, string> = {
  status: "Status: onboarding in progress and application under review.",
  upload: "Upload request received. Your file is now in OCR + security scanning.",
  payslip: "Payslip request recorded. Coordinator will review in stipend queue.",
  certificate: "Certificate request captured. It will unlock once checklist is 100%.",
  support: "Support ticket opened. Our team will respond soon."
};

const redisConnection = createRedisClient("api-whatsapp");
const scanQueue = new Queue("document-scan", { connection: redisConnection });

const expiryByType: Record<string, number | null> = {
  ID: 3650,
  CV: null,
  CERTIFICATE: 90,
  AFFIDAVIT: 90,
  PROOF_OF_ADDRESS: 90,
  PAYSLIP: 30,
  APPLICATION_SUPPORTING_DOC: null
};

function computeExpiration(type: string) {
  const days = expiryByType[type];
  if (!days) return null;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function resolveIntent(body: string) {
  const text = body.trim().toLowerCase();
  if (["1", "status"].includes(text)) return "status";
  if (["2", "upload"].includes(text)) return "upload";
  if (["3", "payslip"].includes(text)) return "payslip";
  if (["4", "certificate"].includes(text)) return "certificate";
  if (["5", "support"].includes(text)) return "support";
  return "unknown";
}

export async function POST(req: Request) {
  const email = cookies().get("if_user")?.value;
  if (!email) return NextResponse.redirect(new URL("/auth", req.url));

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.redirect(new URL("/auth", req.url));

  const platformMembership = await prisma.platformMembership.findFirst({ where: { userId: user.id } });
  if (platformMembership) return NextResponse.redirect(new URL("/hq/dashboard", req.url));

  const formData = await req.formData();
  const threadId = String(formData.get("threadId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  const thread = await prisma.chatThread.findFirst({ where: { id: threadId, userId: user.id } });
  if (!thread) return NextResponse.redirect(new URL("/app/whatsapp-sim", req.url));

  await prisma.chatMessage.create({ data: { threadId: thread.id, role: "USER", body: body || "(empty)" } });

  const file = formData.get("file");
  const wantsUpload = body.toLowerCase() === "upload" && file instanceof File;

  if (wantsUpload) {
    const docType = String(formData.get("docType") ?? "APPLICATION_SUPPORTING_DOC");
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
            sizeBytes: file.size
          }
        }
      }
    });

    try {
      await scanQueue.add("scanDocument", { documentId: document.id, mimeType, sizeBytes: file.size, fileName });
    } catch (error) {
      await prisma.document.update({
        where: { id: document.id },
        data: { status: "SUBMITTED", rejectionReason: "Scan queue unavailable; manual review required." },
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
          metadata: { documentId: document.id, error: error instanceof Error ? error.message : "Unknown queue error" },
        },
      });
    }

    await prisma.chatMessage.create({
      data: {
        threadId: thread.id,
        role: "SYSTEM",
        body: `✅ ${docType} received. OCR + scan queue started (doc: ${document.id.slice(0, 8)}...). We will update your status once checks pass.`
      }
    });

    await prisma.auditLog.create({ data: { userId: user.id, action: "WHATSAPP_DOCUMENT_UPLOADED", metadata: { documentId: document.id, docType, fileName, mimeType } } });

    return NextResponse.redirect(new URL("/app/whatsapp-sim", req.url));
  }

  const intent = resolveIntent(body);
  const autoReply = quickReplies[intent] ?? "Thanks. A coordinator will respond soon.";
  await prisma.chatMessage.create({ data: { threadId: thread.id, role: "SYSTEM", body: autoReply } });

  await prisma.auditLog.create({ data: { userId: user.id, action: "WHATSAPP_INTENT", metadata: { intent, body } } });

  if (intent === "support") {
    const userMembership = await prisma.membership.findFirst({ where: { userId: thread.userId } });
    const ticket = await prisma.ticket.create({ data: { userId: thread.userId, createdByUserId: thread.userId, orgId: userMembership?.organizationId ?? null, title: "WhatsApp support request", summary: autoReply } });
    await prisma.ticketEvent.createMany({
      data: [
        { ticketId: ticket.id, type: "CREATED", event: "Created from WhatsApp simulator", payload: { source: "whatsapp" } },
        { ticketId: ticket.id, type: "TIMELINE", event: `Conversation thread: ${thread.id}`, payload: { threadId: thread.id } }
      ]
    });
  }

  return NextResponse.redirect(new URL("/app/whatsapp-sim", req.url));
}
