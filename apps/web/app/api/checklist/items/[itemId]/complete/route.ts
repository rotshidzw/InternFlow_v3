import { prisma } from "@internflow/db/src";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: { itemId: string } }) {
  const item = await prisma.checklistItemInstance.update({
    where: { id: params.itemId },
    data: { status: "DONE", completedAt: new Date() },
    include: { checklist: { include: { items: true } } }
  });

  const total = item.checklist.items.length;
  const done = item.checklist.items.filter((i) => i.status === "DONE").length;
  await prisma.checklistInstance.update({ where: { id: item.checklistId }, data: { progress: Math.round((done / total) * 100) } });

  return NextResponse.redirect(new URL(req.headers.get("referer") ?? "/workspaces", req.url));
}
