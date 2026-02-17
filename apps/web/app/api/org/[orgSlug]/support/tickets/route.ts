import { prisma } from "@internflow/db/src";
import { getOrgAccess } from "@/lib/org-access";
import { NextResponse } from "next/server";

const CAN_CREATE_TICKETS = new Set(["PROVIDER_ADMIN", "COORDINATOR", "SUPERVISOR"]);
const ALLOWED_CATEGORIES = new Set(["GENERAL", "BILLING", "TECHNICAL", "ONBOARDING"]);
const ALLOWED_PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export async function POST(req: Request, { params }: { params: { orgSlug: string } }) {
  const access = await getOrgAccess(params.orgSlug);
  if ("error" in access) return NextResponse.redirect(new URL("/workspaces", req.url));

  if (!CAN_CREATE_TICKETS.has(access.membership.role)) {
    return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/settings?error=forbidden`, req.url));
  }

  const form = await req.formData();
  const title = String(form.get("title") ?? "").trim();
  const summary = String(form.get("summary") ?? "").trim();
  const category = String(form.get("category") ?? "GENERAL").trim().toUpperCase();
  const priority = String(form.get("priority") ?? "MEDIUM").trim().toUpperCase();

  if (!title || !summary || !ALLOWED_CATEGORIES.has(category) || !ALLOWED_PRIORITIES.has(priority)) {
    return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/settings?error=invalid-ticket`, req.url));
  }

  const ticket = await prisma.ticket.create({
    data: {
      userId: access.user.id,
      createdByUserId: access.user.id,
      orgId: access.membership.organizationId,
      title,
      summary,
      category: category as any,
      priority: priority as any,
      status: "OPEN"
    }
  });

  await prisma.ticketEvent.create({
    data: {
      ticketId: ticket.id,
      actorId: access.user.id,
      type: "TENANT_SUBMITTED",
      event: `Tenant submitted ticket from settings (${access.membership.role})`,
      payload: {
        orgSlug: params.orgSlug,
        role: access.membership.role,
        source: "TENANT_SETTINGS"
      }
    }
  });

  await prisma.auditLog.create({
    data: {
      scope: "ORG",
      actorUserId: access.user.id,
      orgId: access.membership.organizationId,
      action: "TENANT_TICKET_CREATED",
      metadata: {
        ticketId: ticket.id,
        category,
        priority
      }
    }
  });

  return NextResponse.redirect(new URL(`/org/${params.orgSlug}/app/settings?ticket=created`, req.url));
}
