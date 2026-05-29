#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env.local");

function parseEnvFile(raw) {
  return Object.fromEntries(
    raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const idx = line.indexOf("=");
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
      }),
  );
}

function isTrue(value) {
  return String(value ?? "").toLowerCase() === "true";
}

function isBlank(value) {
  return String(value ?? "").trim() === "";
}

if (!fs.existsSync(envPath)) {
  console.error("[ERROR] Missing .env.local file.");
  process.exit(1);
}

const parsed = parseEnvFile(fs.readFileSync(envPath, "utf8"));
const errors = [];
const warnings = [];

const required = [
  "DATABASE_URL",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "AUTH_SESSION_SECRET",
  "REDIS_URL",
  "SMTP_HOST",
  "SMTP_PORT",
  "MAIL_FROM",
  "STORAGE_PROVIDER",
  "OTP_STORE_BACKEND",
  "OTP_TTL_SECONDS",
];

for (const key of required) {
  if (isBlank(parsed[key])) errors.push(`Missing required key: ${key}`);
}

if (!isTrue(parsed.LOCAL_DEV_MODE)) {
  warnings.push(
    "LOCAL_DEV_MODE is not true. Set LOCAL_DEV_MODE=true for predictable local storage behavior.",
  );
}

const storageProvider = (parsed.STORAGE_PROVIDER ?? "").toLowerCase();
if (storageProvider === "obs") {
  warnings.push(
    "STORAGE_PROVIDER=obs in local mode. Ensure OBS credentials are set and reachable.",
  );
  const hasObsAccess = !isBlank(parsed.OBS_ACCESS_KEY) || !isBlank(parsed.OBS_AK);
  const hasObsSecret = !isBlank(parsed.OBS_SECRET_KEY) || !isBlank(parsed.OBS_SK);
  if (!hasObsAccess) warnings.push("OBS access key is missing.");
  if (!hasObsSecret) warnings.push("OBS secret key is missing.");
} else if (storageProvider !== "minio") {
  warnings.push("STORAGE_PROVIDER should normally be 'minio' or 'obs'.");
}

if (isTrue(parsed.ENABLE_AI_ENRICHMENT)) {
  if (isBlank(parsed.OPENROUTER_MODEL)) {
    errors.push("OPENROUTER_MODEL is required when ENABLE_AI_ENRICHMENT=true.");
  }
  if (isBlank(parsed.OPENROUTER_API_KEY)) {
    warnings.push(
      "OPENROUTER_API_KEY is missing while ENABLE_AI_ENRICHMENT=true. AI requests will fallback.",
    );
  }
}

const otpDurable = isTrue(parsed.OTP_ENFORCE_DURABLE);
const otpAllowFallback = isTrue(parsed.OTP_ALLOW_MEMORY_FALLBACK);
if (otpDurable && otpAllowFallback) {
  warnings.push(
    "OTP_ENFORCE_DURABLE=true with OTP_ALLOW_MEMORY_FALLBACK=true is contradictory for staging-like testing.",
  );
}

if (errors.length > 0) {
  console.error("[ERROR] Local env validation failed:");
  for (const error of errors) console.error(` - ${error}`);
  if (warnings.length > 0) {
    console.error("[WARN] Additional warnings:");
    for (const warning of warnings) console.error(` - ${warning}`);
  }
  process.exit(1);
}

console.log("[OK] .env.local validation passed.");
if (warnings.length > 0) {
  console.log("[WARN] Review for local readiness:");
  for (const warning of warnings) console.log(` - ${warning}`);
}
