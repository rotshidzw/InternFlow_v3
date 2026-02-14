import { deterministicSummary } from "@internflow/shared/src/ai/summary";
import { getChecklist, getRecentActions, getUserStatus, listMissingDocs } from "@/lib/ai-tools";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  const summary = deterministicSummary({
    userStatus: await getUserStatus(userId),
    missingDocs: await listMissingDocs(userId),
    checklist: await getChecklist(userId),
    recentActions: await getRecentActions(userId)
  });
  return NextResponse.json({ summary });
}
