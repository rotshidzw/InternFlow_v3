import { prisma } from "@internflow/db/src";
import { logbookEntrySchema } from "@internflow/shared/src/schemas";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await req.json() : Object.fromEntries(await req.formData());
  const parsed = logbookEntrySchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const student = await prisma.user.findUnique({ where: { email: "student@demo.com" } });
  if (!student) return NextResponse.json({ error: "Missing student" }, { status: 404 });

  const entry = await prisma.logbookEntry.create({
    data: {
      userId: student.id,
      weekStart: new Date(parsed.data.weekStart),
      summary: parsed.data.summary,
      evidenceKey: parsed.data.evidenceKey
    }
  });

  if (!contentType.includes("application/json")) {
    return NextResponse.redirect(new URL("/app/student", req.url));
  }

  return NextResponse.json({ ok: true, entryId: entry.id });
}
