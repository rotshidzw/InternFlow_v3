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

  let eventLabel = `HQ action: ${action}`;

  if (action === "RESOLVE") {
    if (ticket.status !== "RESOLVED") {
      await prisma.ticket.update({ where: { id: ticket.id }, data: { status: "RESOLVED" } });
    }
    eventLabel = "Issue resolved by support/ops";
  } else if (action === "ESCALATE_OPS") {
    if (actor.membership.role === "PLATFORM_OPS") {
      return NextResponse.redirect(new URL("/hq/support", req.url));
    }

    await prisma.ticket.update({ where: { id: ticket.id }, data: { status: "IN_PROGRESS", priority: "URGENT" } });
    eventLabel = "Escalated to Ops for urgent handling";

    const recipients = await prisma.platformMembership.findMany({
      where: { role: { in: ["PLATFORM_OPS", "PLATFORM_ADMIN"] } },
      include: { user: true }
    });
    const recipientEmails = Array.from(new Set(recipients.map((m) => m.user.email)));
    if (recipientEmails.length) {
      await sendPlatformEmailMany(recipientEmails, "Ticket escalated to Ops", message || `Ticket ${ticket.title} requires Ops attention.`);
    }
  } else if (action === "REQUEST_INFO") {
    eventLabel = "More information requested from tenant";
  }

  await prisma.ticketEvent.create({
    data: {
      ticketId: ticket.id,
      actorId: actor.user.id,
      type: action,
      event: eventLabel,
      payload: {
        action,
        message,
        actorRole: actor.membership.role
      }
    }
  });

  await prisma.auditLog.create({ data: { scope: "PLATFORM", actorUserId: actor.user.id, orgId: ticket.orgId ?? null, action: `HQ_TICKET_${action}`, metadata: { message, actorRole: actor.membership.role } } });

  if (action === "REQUEST_INFO" && ticket.orgId) {
    const recipients = await getTenantContactEmails(ticket.orgId);
    await sendPlatformEmailMany(recipients, "More information requested", message || `Please provide more info for ticket ${ticket.id}`);
  }

  return NextResponse.redirect(new URL("/hq/support", req.url));
}
