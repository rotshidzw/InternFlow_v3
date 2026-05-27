import { prisma } from "@internflow/db/src";

export async function getUserStatus(userId: string) {
  const enrollments = await prisma.enrollment.count({ where: { userId } });
  return enrollments ? "Enrolled in active programme" : "Not enrolled";
}
export async function listMissingDocs(userId: string) {
  const docs = await prisma.document.findMany({ where: { userId, status: { in: ["SUBMITTED", "SCAN_FAILED", "REJECTED"] } } });
  return docs.map((d) => `${d.type} (${d.status})`);
}
export async function getChecklist(userId: string) {
  const apps = await prisma.application.findMany({ where: { userId }, include: { checklist: { include: { items: true } } } });
  return apps.flatMap((a) => a.checklist?.items ?? []).map((i) => ({ label: i.label, status: i.status }));
}
export async function getRecentActions(userId: string) {
  const logs = await prisma.auditLog.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 });
  return logs.map((l) => l.action);
}
