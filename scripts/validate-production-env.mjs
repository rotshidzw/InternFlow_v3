#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env.production");

if (!fs.existsSync(envPath)) {
  console.error("❌ Missing .env.production file.");
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
  "NODE_ENV",
  "APP_URL",
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "REDIS_URL",
  "STORAGE_PROVIDER",
  "OBS_BUCKET",
  "OBS_REGION",
  "OBS_ENDPOINT",
  "SMTP_HOST",
  "SMTP_PORT",
  "MAIL_FROM",
  "ENABLE_AI_ENRICHMENT",
  "OPENROUTER_MODEL",
];

const missing = [];
for (const key of required) {
  if (!parsed[key]) missing.push(key);
}

if (parsed.STORAGE_PROVIDER === "obs") {
  const hasObsAccess = Boolean(parsed.OBS_ACCESS_KEY || parsed.OBS_AK);
  const hasObsSecret = Boolean(parsed.OBS_SECRET_KEY || parsed.OBS_SK);
  if (!hasObsAccess) missing.push("OBS_ACCESS_KEY or OBS_AK");
  if (!hasObsSecret) missing.push("OBS_SECRET_KEY or OBS_SK");
}

if (parsed.ENABLE_AI_ENRICHMENT === "true" && !parsed.OPENROUTER_API_KEY) {
  missing.push("OPENROUTER_API_KEY");
}

if (parsed.ENABLE_OCR === "true") {
  for (const key of [
    "HUAWEI_OCR_ENDPOINT",
    "HUAWEI_PROJECT_ID",
    "HUAWEI_ACCESS_KEY",
    "HUAWEI_SECRET_KEY",
  ]) {
    if (!parsed[key]) missing.push(key);
  }
}

if (missing.length) {
  console.error("❌ Production env validation failed.");
  for (const item of missing) console.error(` - Missing: ${item}`);
  process.exit(1);
}

if (parsed.NODE_ENV !== "production") {
  console.warn("⚠️ NODE_ENV is not set to production.");
}

console.log("✅ .env.production validation passed.");
