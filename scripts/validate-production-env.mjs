#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env.production");

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
  console.error("[ERROR] Missing .env.production file.");
  process.exit(1);
}

const parsed = parseEnvFile(fs.readFileSync(envPath, "utf8"));
const errors = [];
const warnings = [];

const required = [
  "NODE_ENV",
  "APP_URL",
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "AUTH_SESSION_SECRET",
  "REDIS_URL",
  "STORAGE_PROVIDER",
  "SMTP_HOST",
  "SMTP_PORT",
  "MAIL_FROM",
  "OTP_STORE_BACKEND",
  "OTP_TTL_SECONDS",
  "OTP_REDIS_KEY_PREFIX",
];

for (const key of required) {
  if (isBlank(parsed[key])) errors.push(`Missing required key: ${key}`);
}

if ((parsed.NODE_ENV ?? "").toLowerCase() !== "production") {
  warnings.push("NODE_ENV is not set to production.");
}

const otpBackend = (parsed.OTP_STORE_BACKEND ?? "").toLowerCase();
const otpDurable = isTrue(parsed.OTP_ENFORCE_DURABLE);
const otpAllowFallback = isTrue(parsed.OTP_ALLOW_MEMORY_FALLBACK);

if (!["redis", "auto", "memory"].includes(otpBackend)) {
  errors.push("OTP_STORE_BACKEND must be one of: redis, auto, memory.");
}

if (otpBackend !== "redis") {
  warnings.push(
    "OTP_STORE_BACKEND is not 'redis'. For staging/production durability, use OTP_STORE_BACKEND=redis.",
  );
}

if (otpDurable && otpBackend !== "redis") {
  errors.push("OTP_ENFORCE_DURABLE=true requires OTP_STORE_BACKEND=redis.");
}

if (otpDurable && otpAllowFallback) {
  errors.push("OTP_ALLOW_MEMORY_FALLBACK must be false when OTP_ENFORCE_DURABLE=true.");
}

if (otpBackend === "redis" && !otpDurable) {
  warnings.push(
    "OTP_ENFORCE_DURABLE is not true. Durable OTP is recommended for staging/production.",
  );
}

if (isTrue(parsed.ENABLE_DEMO_LOGIN) || isTrue(parsed.NEXT_PUBLIC_ENABLE_DEMO_LOGIN)) {
  errors.push("Demo login must be disabled in production-like environments.");
}

if (isTrue(parsed.ENABLE_CONSOLE_OTP)) {
  warnings.push(
    "ENABLE_CONSOLE_OTP=true will print OTP fallback messages to logs. Disable for real production.",
  );
}

const storageProvider = (parsed.STORAGE_PROVIDER ?? "").toLowerCase();
if (storageProvider === "obs") {
  for (const key of ["OBS_BUCKET", "OBS_REGION", "OBS_ENDPOINT"]) {
    if (isBlank(parsed[key])) errors.push(`Missing required OBS key: ${key}`);
  }

  const hasObsAccess = !isBlank(parsed.OBS_ACCESS_KEY) || !isBlank(parsed.OBS_AK);
  const hasObsSecret = !isBlank(parsed.OBS_SECRET_KEY) || !isBlank(parsed.OBS_SK);
  if (!hasObsAccess) errors.push("Missing OBS access key: set OBS_ACCESS_KEY (or OBS_AK).");
  if (!hasObsSecret) errors.push("Missing OBS secret key: set OBS_SECRET_KEY (or OBS_SK).");
} else if (storageProvider === "minio") {
  warnings.push(
    "STORAGE_PROVIDER=minio detected. Use OBS/object storage for production unless this is intentional staging infrastructure.",
  );
  for (const key of ["MINIO_ENDPOINT", "MINIO_PORT", "MINIO_ACCESS_KEY", "MINIO_SECRET_KEY", "MINIO_BUCKET"]) {
    if (isBlank(parsed[key])) warnings.push(`MINIO key not set: ${key}`);
  }
} else {
  errors.push("STORAGE_PROVIDER must be 'obs' or 'minio'.");
}

if (!isBlank(parsed.SMTP_USER) && isBlank(parsed.SMTP_PASS)) {
  errors.push("SMTP_PASS is required when SMTP_USER is set.");
}

if (isBlank(parsed.SMTP_USER) && !isBlank(parsed.SMTP_PASS)) {
  warnings.push("SMTP_PASS is set but SMTP_USER is empty.");
}

if ((parsed.SMTP_HOST ?? "").toLowerCase() === "localhost") {
  warnings.push(
    "SMTP_HOST=localhost detected. This is usually only valid for local/MailHog style environments.",
  );
}

if (String(parsed.APP_URL ?? "").startsWith("http://")) {
  warnings.push("APP_URL uses http://. Use https:// in staging/production.");
}

if (isTrue(parsed.ENABLE_AI_ENRICHMENT)) {
  if (isBlank(parsed.OPENROUTER_MODEL)) {
    errors.push("OPENROUTER_MODEL is required when ENABLE_AI_ENRICHMENT=true.");
  }
  if (isBlank(parsed.OPENROUTER_API_KEY)) {
    errors.push("OPENROUTER_API_KEY is required when ENABLE_AI_ENRICHMENT=true.");
  }
}

if (isTrue(parsed.ENABLE_OCR)) {
  for (const key of [
    "HUAWEI_OCR_ENDPOINT",
    "HUAWEI_PROJECT_ID",
    "HUAWEI_ACCESS_KEY",
    "HUAWEI_SECRET_KEY",
  ]) {
    if (isBlank(parsed[key])) errors.push(`Missing OCR key: ${key}`);
  }
}

if (isBlank(parsed.CONTACT_WHATSAPP_WEBHOOK_URL)) {
  warnings.push(
    "CONTACT_WHATSAPP_WEBHOOK_URL is not set. WhatsApp contact notifications will be webhook-ready but inactive.",
  );
}

if (errors.length > 0) {
  console.error("[ERROR] Production env validation failed:");
  for (const error of errors) console.error(` - ${error}`);
  if (warnings.length > 0) {
    console.error("[WARN] Additional warnings:");
    for (const warning of warnings) console.error(` - ${warning}`);
  }
  process.exit(1);
}

console.log("[OK] .env.production validation passed.");
if (warnings.length > 0) {
  console.log("[WARN] Review before go-live:");
  for (const warning of warnings) console.log(` - ${warning}`);
}
