import { z } from "zod";
import { prisma } from "@internflow/db/src";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openrouter/free";
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;

const cvExtractionSchema = z.object({
  fullName: z.string().nullable().default(null),
  email: z.string().email().nullable().default(null),
  phone: z.string().nullable().default(null),
  location: z.string().nullable().default(null),
  education: z.array(z.string()).default([]),
  experience: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  summary: z.string().nullable().default(null),
});

export type CvExtractionResult = z.infer<typeof cvExtractionSchema>;

function aiEnabled() {
  return process.env.ENABLE_AI_ENRICHMENT === "true";
}

function resolveModel() {
  return process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL;
}

function resolveApiKey() {
  return process.env.OPENROUTER_API_KEY?.trim();
}

function isTransientError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes("timeout") ||
    error.message.includes("ECONNRESET") ||
    error.message.includes("429") ||
    error.message.includes("503")
  );
}

function extractJsonObject(raw: string) {
  const cleaned = raw.trim();
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const source = fenced?.trim() || cleaned;

  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model response");
  }

  return JSON.parse(source.slice(start, end + 1));
}

async function callOpenRouter(messages: Array<{ role: "system" | "user" | "assistant"; content: string }>) {
  if (!aiEnabled()) {
    throw new Error("AI enrichment disabled");
  }

  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  const model = resolveModel();
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= MAX_RETRIES) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(OPENROUTER_ENDPOINT, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter request failed (${response.status})`);
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = payload.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("OpenRouter response missing content");
      return text;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown OpenRouter error");
      if (!isTransientError(lastError) || attempt >= MAX_RETRIES) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    } finally {
      clearTimeout(timeout);
    }

    attempt += 1;
  }

  throw lastError ?? new Error("OpenRouter request failed");
}

export async function generateChatbotAssistance(args: {
  userId?: string;
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}) {
  const message = args.message.trim();
  if (!message) {
    return {
      ok: false as const,
      usedFallback: true,
      reply: "Please enter a message so I can help.",
      reason: "empty_message",
    };
  }

  console.info("[ai] started AI enrichment", {
    feature: "chatbot",
    hasHistory: Boolean(args.history?.length),
  });

  try {
    const historyMessages = (args.history ?? []).slice(-6).map((item) => ({
      role: item.role,
      content: item.content.slice(0, 1200),
    }));

    const response = await callOpenRouter([
      {
        role: "system",
        content:
          "You are InternFlow assistant. Give concise, practical and compliance-aware guidance for students and tenant coordinators.",
      },
      ...historyMessages,
      { role: "user", content: message.slice(0, 2000) },
    ]);

    console.info("[ai] succeeded AI enrichment", { feature: "chatbot" });
    return { ok: true as const, usedFallback: false, reply: response };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI chatbot error";
    console.error("[ai] failed AI enrichment", { feature: "chatbot", error: message });
    console.warn("[ai] fallback used", { feature: "chatbot" });

    return {
      ok: false as const,
      usedFallback: true,
      reason: message,
      reply:
        "I can still help with profile, documents, status, and support tickets. AI assistant is unavailable right now.",
    };
  }
}

export async function extractCandidateProfileFromCv(cvText: string) {
  const normalizedText = cvText.replace(/\r/g, "").trim();
  if (!normalizedText) {
    return {
      ok: false as const,
      usedFallback: true,
      reason: "empty_cv_text",
      fields: cvExtractionSchema.parse({}),
    };
  }

  console.info("[ai] started AI enrichment", { feature: "cv_parse" });

  try {
    const content = await callOpenRouter([
      {
        role: "system",
        content:
          "Extract candidate data from CV text. Return strict JSON only with keys: fullName,email,phone,location,education,experience,skills,certifications,summary. Use null for unknown scalar values and [] for unknown lists.",
      },
      {
        role: "user",
        content: normalizedText.slice(0, 16_000),
      },
    ]);

    const parsed = extractJsonObject(content);
    const safe = cvExtractionSchema.parse(parsed);

    console.info("[ai] succeeded AI enrichment", { feature: "cv_parse" });
    return { ok: true as const, usedFallback: false, fields: safe };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown CV parsing error";
    console.error("[ai] failed AI enrichment", { feature: "cv_parse", error: message });
    console.warn("[ai] fallback used", { feature: "cv_parse" });
    return {
      ok: false as const,
      usedFallback: true,
      reason: message,
      fields: cvExtractionSchema.parse({}),
    };
  }
}

export async function runProfileAiEnrichment(args: {
  userId: string;
  studentProfileId: string;
  cvText: string;
}) {
  await prisma.auditEvent.create({
    data: {
      userId: args.userId,
      action: "AI_ENRICHMENT_STARTED",
      entityType: "StudentProfile",
      entityId: args.studentProfileId,
      metadata: { source: "student_profile_save" },
    },
  });

  const result = await extractCandidateProfileFromCv(args.cvText);

  if (!result.ok) {
    await prisma.auditEvent.create({
      data: {
        userId: args.userId,
        action: "AI_ENRICHMENT_FALLBACK",
        entityType: "StudentProfile",
        entityId: args.studentProfileId,
        metadata: { reason: result.reason },
      },
    });
    return;
  }

  await prisma.auditEvent.create({
    data: {
      userId: args.userId,
      action: "AI_ENRICHMENT_SUCCEEDED",
      entityType: "StudentProfile",
      entityId: args.studentProfileId,
      metadata: {
        extractedSkills: result.fields.skills.length,
        extractedExperience: result.fields.experience.length,
      },
    },
  });
}
