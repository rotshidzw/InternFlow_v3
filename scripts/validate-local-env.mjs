#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env.local");

if (!fs.existsSync(envPath)) {
  console.error("❌ Missing .env.local file.");
  process.exit(1);
}

const raw = fs.readFileSync(envPath, "utf8");
const parsed = Object.fromEntries(
  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    }),
);

const required = [
  "DATABASE_URL",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "REDIS_URL",
  "SMTP_HOST",
  "SMTP_PORT",
  "ENABLE_AI_ENRICHMENT",
  "OPENROUTER_MODEL",
];

const missing = required.filter((key) => !parsed[key]);

if (missing.length) {
  console.error("❌ Local env validation failed.");
  for (const key of missing) console.error(` - Missing: ${key}`);
  process.exit(1);
}

if (parsed.LOCAL_DEV_MODE !== "true") {
  console.warn(
    "⚠️ LOCAL_DEV_MODE is not true. Set LOCAL_DEV_MODE=true to force local MinIO/local integrations.",
  );
}

if ((parsed.STORAGE_PROVIDER ?? "minio") === "obs") {
  console.warn(
    "⚠️ STORAGE_PROVIDER is obs. For local mode, set STORAGE_PROVIDER=minio (or keep LOCAL_DEV_MODE=true).",
  );
}

if ((parsed.OPENROUTER_MODEL ?? "").trim() === "") {
  console.warn("⚠️ OPENROUTER_MODEL missing. Defaulting to openrouter/free.");
}

if (parsed.ENABLE_AI_ENRICHMENT === "true" && !parsed.OPENROUTER_API_KEY) {
  console.warn("⚠️ ENABLE_AI_ENRICHMENT=true but OPENROUTER_API_KEY is missing. AI will fallback.");
}

console.log("✅ .env.local validation passed.");
