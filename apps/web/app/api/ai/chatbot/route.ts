import { NextResponse } from "next/server";
import { z } from "zod";
import { generateChatbotAssistance } from "@/lib/openrouter-ai";
import { getAuthenticatedEmailFromCookies } from "@/lib/auth-session";

const schema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      }),
    )
    .optional(),
});

export async function POST(req: Request) {
  const email = getAuthenticatedEmailFromCookies();
  if (!email) {
    return NextResponse.json(
      { ok: false, error: "Unauthenticated" },
      { status: 401 },
    );
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid chatbot payload" },
      { status: 400 },
    );
  }

  const result = await generateChatbotAssistance({
    message: parsed.data.message,
    history: parsed.data.history,
  });

  return NextResponse.json({
    ok: true,
    reply: result.reply,
    aiUsed: !result.usedFallback,
    fallbackReason: result.usedFallback ? result.reason : undefined,
  });
}
