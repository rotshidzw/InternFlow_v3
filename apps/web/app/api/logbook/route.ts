import { prisma } from "@internflow/db/src";
import { logbookEntrySchema } from "@internflow/shared/src/schemas";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await req.json() : Object.fromEntries(await req.formData());
  const parsed = logbookEntrySchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const actor = await getCurrentUser();
  if (!actor) {
    if (!contentType.includes("application/json")) return NextResponse.redirect(new URL("/auth/login", req.url));
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const hasStudentMembership = await prisma.membership.findFirst({
    where: { userId: actor.id, role: "STUDENT" },
    select: { id: true },
  });

  if (actor.role !== "STUDENT" && !hasStudentMembership) {
    return NextResponse.json({ ok: false, error: "Only learners can submit logbooks" }, { status: 403 });
  }

  const entry = await prisma.logbookEntry.create({
    data: {
      userId: actor.id,
      weekStart: new Date(parsed.data.weekStart),
      summary: parsed.data.summary,
      evidenceKey: parsed.data.evidenceKey
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: "LOGBOOK_SUBMITTED",
      metadata: { entryId: entry.id, weekStart: parsed.data.weekStart },
    },
  });

  if (!contentType.includes("application/json")) {
    return NextResponse.redirect(new URL("/app/student", req.url));
  }

  return NextResponse.json({ ok: true, entryId: entry.id });
}
