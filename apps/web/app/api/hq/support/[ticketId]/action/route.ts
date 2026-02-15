import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { requirePlatformApiUser } from "@/lib/hq/api-auth";
import { sendPlatformEmail } from "@/lib/mailer";

export async function POST(req: Request, { params }: { params: { ticketId: string } }) {
  const actor = await requirePlatformApiUser();
  if (!actor) return NextResponse.json({ ok: false }, { status: 403 });
  const form = await req.formData();
  const action = String(form.get("action") ?? "");

  const ticket = await prisma.ticket.findUnique({ where: { id: params.ticketId } });
  if (!ticket) return NextResponse.redirect(new URL("/hq/support", req.url));

  if (action === "RESOLVE") {
    await prisma.ticket.update({ where: { id: ticket.id }, data: { status: "RESOLVED" } });
  } else if (action === "ESCALATE_OPS") {
    await prisma.ticket.update({ where: { id: ticket.id }, data: { status: "IN_PROGRESS", priority: "URGENT" } });
  }

  await prisma.ticketEvent.create({ data: { ticketId: ticket.id, type: action, event: `HQ action: ${action}`, payload: { action } } });
  await prisma.auditLog.create({ data: { scope: "PLATFORM", orgId: ticket.orgId ?? null, action: `HQ_TICKET_${action}` } });

  if (action === "REQUEST_INFO") {
    await sendPlatformEmail("admin@internflow.com", "Request info", `Please provide more info for ticket ${ticket.id}`);
  }

  return NextResponse.redirect(new URL("/hq/support", req.url));
}
