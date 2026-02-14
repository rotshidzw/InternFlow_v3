import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";

const quickReplies: Record<string, string> = {
  "1": "Status: onboarding in progress.",
  "2": "Upload documents in Student Portal or send attachment here.",
  "3": "Your logbook has pending supervisor approval.",
  "4": "Certificate request accepted once checklist reaches 100%.",
  "5": "Support ticket has been opened."
};

export async function POST(req: Request) {
  const formData = await req.formData();
  const threadId = String(formData.get("threadId"));
  const body = String(formData.get("body"));

  await prisma.chatMessage.create({ data: { threadId, role: "USER", body } });
  const autoReply = quickReplies[body] ?? "Thanks. A coordinator will respond soon.";
  await prisma.chatMessage.create({ data: { threadId, role: "SYSTEM", body: autoReply } });

  if (body === "5") {
    const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
    if (thread) {
      const ticket = await prisma.ticket.create({ data: { userId: thread.userId, title: "WhatsApp support request", summary: autoReply } });
      await prisma.ticketEvent.create({ data: { ticketId: ticket.id, event: "Created from WhatsApp simulator" } });
    }
  }

  return NextResponse.redirect(new URL("/app/whatsapp-sim", req.url));
}
