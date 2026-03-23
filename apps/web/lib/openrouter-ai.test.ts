import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  extractCandidateProfileFromCv,
  generateChatbotAssistance,
} from "./openrouter-ai";

describe("openrouter-ai", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.ENABLE_AI_ENRICHMENT = "true";
    process.env.OPENROUTER_MODEL = "openrouter/free";
    process.env.OPENROUTER_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("uses fallback when API key is missing", async () => {
    process.env.OPENROUTER_API_KEY = "";
    const result = await extractCandidateProfileFromCv("John Doe\njohn@example.com");
    expect(result.ok).toBe(false);
    expect(result.usedFallback).toBe(true);
  });

  it("uses fallback when AI is disabled", async () => {
    process.env.ENABLE_AI_ENRICHMENT = "false";
    const result = await generateChatbotAssistance({ message: "Hello" });
    expect(result.usedFallback).toBe(true);
  });

  it("handles timeout/failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("timeout");
      }),
    );

    const result = await generateChatbotAssistance({ message: "Need help" });
    expect(result.ok).toBe(false);
    expect(result.usedFallback).toBe(true);
  });

  it("parses valid CV extraction JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  fullName: "Jane Doe",
                  email: "jane@example.com",
                  phone: "+27110000000",
                  location: "Johannesburg",
                  education: ["BSc Computer Science"],
                  experience: ["Intern at X"],
                  skills: ["JavaScript"],
                  certifications: ["AWS CCP"],
                  summary: "Entry-level software engineer",
                }),
              },
            },
          ],
        }),
      })) as any,
    );

    const result = await extractCandidateProfileFromCv("Jane Doe CV text");
    expect(result.ok).toBe(true);
    expect(result.fields.fullName).toBe("Jane Doe");
    expect(result.fields.skills).toContain("JavaScript");
  });

  it("uses fallback on malformed model response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "not-json" } }],
        }),
      })) as any,
    );

    const result = await extractCandidateProfileFromCv("CV text");
    expect(result.ok).toBe(false);
    expect(result.usedFallback).toBe(true);
  });
});
