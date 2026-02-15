import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";
import { requirePlatformApiUserWithRole } from "@/lib/hq/api-auth";
import { sendPlatformEmailMany } from "@/lib/mailer";
import { getTenantContactEmails } from "@/lib/hq/tenant-contacts";

export async function POST(req: Request, { params }: { params: { ticketId: string } }) {
  const actor = await requirePlatformApiUserWithRole(["PLATFORM_ADMIN", "PLATFORM_SUPPORT", "PLATFORM_OPS"]);
  if (!actor) return NextResponse.json({ ok: false }, { status: 403 });

  const form = await req.formData();
  const action = String(form.get("action") ?? "");
  const message = String(form.get("message") ?? "").trim();

  const ticket = await prisma.ticket.findUnique({ where: { id: params.ticketId } });
  if (!ticket) return NextResponse.redirect(new URL("/hq/support", req.url));

  if (action === "RESOLVE") {
    await prisma.ticket.update({ where: { id: ticket.id }, data: { status: "RESOLVED" } });
  } else if (action === "ESCALATE_OPS") {
    await prisma.ticket.update({ where: { id: ticket.id }, data: { status: "IN_PROGRESS", priority: "URGENT" } });

    const opsUsers = await prisma.platformMembership.findMany({
      where: { role: "PLATFORM_OPS" },
      include: { user: true }
    });
    const opsEmails = opsUsers.map((m) => m.user.email);
    if (opsEmails.length) {
      await sendPlatformEmailMany(opsEmails, "Ticket escalated to Ops", message || `Ticket ${ticket.title} requires Ops attention.`);
    }
  }

  await prisma.ticketEvent.create({ data: { ticketId: ticket.id, type: action, event: `HQ action: ${action}`, payload: { action, message } } });
  await prisma.auditLog.create({ data: { scope: "PLATFORM", actorUserId: actor.user.id, orgId: ticket.orgId ?? null, action: `HQ_TICKET_${action}`, metadata: { message } } });

  if (action === "REQUEST_INFO" && ticket.orgId) {
    const recipients = await getTenantContactEmails(ticket.orgId);
    await sendPlatformEmailMany(recipients, "More information requested", message || `Please provide more info for ticket ${ticket.id}`);
  }

  return NextResponse.redirect(new URL("/hq/support", req.url));
}
