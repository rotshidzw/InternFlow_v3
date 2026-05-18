import { prisma } from "@internflow/db/src";
import {
  TENANT_ROLE_GROUPS,
  resolveTenantApiActor,
  tenantApiAuthErrorResponse,
} from "@/lib/tenant-api-auth";

function csv(rows: string[][]) {
  return rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
}

export async function GET(_: Request, { params }: { params: { orgSlug: string; file: string } }) {
  const actor = await resolveTenantApiActor({
    orgSlug: params.orgSlug,
    allowedRoles: TENANT_ROLE_GROUPS.EXPORT_READ,
  });
  if (!actor.ok) return tenantApiAuthErrorResponse(actor);

  const orgId = actor.actor.membership.organizationId;
  let rows: string[][];
  let rowCount = 0;

  if (params.file === "stipend.csv") {
    const enrollments = await prisma.enrollment.findMany({
      where: { organizationId: orgId },
      include: { user: true, cohort: true },
    });
    rowCount = enrollments.length;
    rows = [
      ["email", "cohort", "stipendPaid", "stipendMonth"],
      ...enrollments.map((r) => [r.user.email, r.cohort?.name ?? "", String(r.stipendPaid), r.stipendMonth ?? ""]),
    ];
  } else if (params.file === "compliance.csv") {
    const docs = await prisma.document.findMany({
      where: { organizationId: orgId },
      include: { user: true },
    });
    rowCount = docs.length;
    rows = [
      ["email", "type", "status", "createdAt"],
      ...docs.map((d) => [d.user.email, d.type, d.status, d.createdAt.toISOString()]),
    ];
  } else if (params.file === "learners.csv") {
    const learners = await prisma.membership.findMany({
      where: { organizationId: orgId, role: "STUDENT" },
      include: { user: true },
    });
    rowCount = learners.length;
    rows = [["email", "name"], ...learners.map((l) => [l.user.email, l.user.name ?? ""])];
  } else {
    return new Response("Not found", { status: 404 });
  }

  await prisma.auditEvent.create({
    data: {
      tenantId: orgId,
      userId: actor.actor.user.id,
      action: "EXPORT_CSV_DOWNLOADED",
      entityType: "Organization",
      entityId: orgId,
      metadata: { file: params.file, rowCount },
    },
  });

  const body = csv(rows);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"${params.file}\"`,
    },
  });
}
