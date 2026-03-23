import { z } from "zod";
import { prisma } from "@internflow/db/src";
import fs from "node:fs";
import path from "node:path";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openrouter/free";
const DEFAULT_REQUEST_TIMEOUT_MS = 45_000;
const MAX_RETRIES = 2;
const ENV_FILE_CANDIDATES = Array.from(
  new Set([
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "..", ".env.local"),
    path.resolve(process.cwd(), "..", ".env"),
    path.resolve(process.cwd(), "..", "..", ".env.local"),
    path.resolve(process.cwd(), "..", "..", ".env"),
    path.resolve(process.cwd(), "apps/web/.env.local"),
    path.resolve(process.cwd(), "apps/web/.env"),
  ]),
);

type AiRuntimeState = {
  cachedEnvFallback: Record<string, string> | null;
  cachedEnvSource: Record<string, string> | null;
  didLogAiConfig: boolean;
};

const aiRuntimeState: AiRuntimeState = (
  globalThis as typeof globalThis & { __internflowAiRuntimeState?: AiRuntimeState }
).__internflowAiRuntimeState ?? {
  cachedEnvFallback: null,
  cachedEnvSource: null,
  didLogAiConfig: false,
};

(
  globalThis as typeof globalThis & { __internflowAiRuntimeState?: AiRuntimeState }
).__internflowAiRuntimeState = aiRuntimeState;

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
  const value = readAiEnv("ENABLE_AI_ENRICHMENT").value;
  return value === "true";
}

function resolveModel() {
  return readAiEnv("OPENROUTER_MODEL").value || DEFAULT_MODEL;
}

function resolveApiKey() {
  return readAiEnv("OPENROUTER_API_KEY").value;
}

function resolveTimeoutMs() {
  const raw = readAiEnv("OPENROUTER_TIMEOUT_MS").value;
  if (!raw) return DEFAULT_REQUEST_TIMEOUT_MS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 5_000) return DEFAULT_REQUEST_TIMEOUT_MS;
  return Math.floor(parsed);
}

function parseEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const idx = trimmed.indexOf("=");
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (key) parsed[key] = value;
  }
  return parsed;
}

function getFallbackEnv() {
  if (aiRuntimeState.cachedEnvFallback && aiRuntimeState.cachedEnvSource) {
    return {
      values: aiRuntimeState.cachedEnvFallback,
      sources: aiRuntimeState.cachedEnvSource,
    };
  }
  const merged: Record<string, string> = {};
  const sources: Record<string, string> = {};
  for (const filePath of ENV_FILE_CANDIDATES) {
    const parsed = parseEnvFile(filePath);
    for (const [key, value] of Object.entries(parsed)) {
      if (!(key in merged)) {
        merged[key] = value;
        sources[key] = filePath;
      }
    }
  }
  aiRuntimeState.cachedEnvFallback = merged;
  aiRuntimeState.cachedEnvSource = sources;
  return { values: merged, sources };
}

function readAiEnv(name: string) {
  const processValue = process.env[name]?.trim();
  if (processValue) return { value: processValue, source: "process.env" };

  const fallbackEnv = getFallbackEnv();
  const fallback = fallbackEnv.values[name]?.trim();
  if (!fallback) return { value: undefined, source: null };
  return { value: fallback, source: fallbackEnv.sources[name] ?? "env-fallback-cache" };
}

function logResolvedAiConfig() {
  if (aiRuntimeState.didLogAiConfig) return;
  aiRuntimeState.didLogAiConfig = true;

  const enabledVar = readAiEnv("ENABLE_AI_ENRICHMENT");
  const modelVar = readAiEnv("OPENROUTER_MODEL");
  const apiKeyVar = readAiEnv("OPENROUTER_API_KEY");
  const enabled = enabledVar.value === "true";
  const model = modelVar.value || DEFAULT_MODEL;
  const apiKey = apiKeyVar.value;
  const timeoutMs = resolveTimeoutMs();

  console.info("[ai] config loaded", {
    enabled,
    model,
    timeoutMs,
    hasApiKey: Boolean(apiKey),
    sources: {
      flag: enabledVar.source,
      model: modelVar.source,
      apiKey: apiKeyVar.source,
    },
  });

  if (!enabled) {
    console.info("[ai] AI disabled by flag");
    return;
  }

  if (!apiKey) {
    console.warn("[ai] missing API key; fallback will be used");
  }
}

function isTransientError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "AbortError" ||
    error.message.includes("aborted") ||
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
  logResolvedAiConfig();

  if (!aiEnabled()) {
    throw new Error("AI enrichment disabled");
  }

  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  const model = resolveModel();
  const timeoutMs = resolveTimeoutMs();
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= MAX_RETRIES) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      console.info("[ai] OpenRouter request started", { model, attempt: attempt + 1, timeoutMs });
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
      console.info("[ai] OpenRouter request succeeded", { model, attempt: attempt + 1 });
      return text;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown OpenRouter error");
      console.error("[ai] OpenRouter request failed", {
        model,
        attempt: attempt + 1,
        error: lastError.message,
      });
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
