import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";

const quickReplies: Record<string, string> = {
  status: "Status: onboarding in progress and application under review.",
  upload: "Upload request created. Please open your Document Vault in the portal.",
  payslip: "Payslip request recorded. Coordinator will review in stipend queue.",
  certificate: "Certificate request captured. It will unlock once checklist is 100%.",
  support: "Support ticket opened. Our team will respond soon."
};

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
  const formData = await req.formData();
  const threadId = String(formData.get("threadId"));
  const body = String(formData.get("body"));

  await prisma.chatMessage.create({ data: { threadId, role: "USER", body } });

  const intent = resolveIntent(body);
  const autoReply = quickReplies[intent] ?? "Thanks. A coordinator will respond soon.";
  await prisma.chatMessage.create({ data: { threadId, role: "SYSTEM", body: autoReply } });

  const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
  if (thread) {
    await prisma.auditLog.create({ data: { userId: thread.userId, action: "WHATSAPP_INTENT", metadata: { intent, body } } });

    if (intent === "support") {
      const ticket = await prisma.ticket.create({ data: { userId: thread.userId, title: "WhatsApp support request", summary: autoReply } });
      await prisma.ticketEvent.createMany({
        data: [
          { ticketId: ticket.id, event: "Created from WhatsApp simulator" },
          { ticketId: ticket.id, event: `Conversation thread: ${threadId}` }
        ]
      });
    }
  }

  return NextResponse.redirect(new URL("/app/whatsapp-sim", req.url));
}
