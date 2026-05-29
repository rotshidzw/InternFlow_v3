import { createHash, timingSafeEqual } from "node:crypto";
import { createRedisClient } from "@/lib/redis-queue";

const parsedTtlSeconds = Number(process.env.OTP_TTL_SECONDS ?? "600");
const OTP_TTL_SECONDS =
  Number.isFinite(parsedTtlSeconds) && parsedTtlSeconds > 0
    ? Math.min(parsedTtlSeconds, 60 * 60)
    : 600;
const OTP_TTL_MS = OTP_TTL_SECONDS * 1000;
const OTP_STORE_BACKEND = (process.env.OTP_STORE_BACKEND ?? "auto").toLowerCase();
const OTP_REDIS_KEY_PREFIX = process.env.OTP_REDIS_KEY_PREFIX ?? "internflow:otp:";
const OTP_ALLOW_MEMORY_FALLBACK = process.env.OTP_ALLOW_MEMORY_FALLBACK === "true";
const OTP_ENFORCE_DURABLE = (() => {
  const value = (process.env.OTP_ENFORCE_DURABLE ?? "").toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  return process.env.NODE_ENV === "production";
})();

type OtpRecord = {
  digest: string;
  expiresAt: number;
};

export class OtpStoreUnavailableError extends Error {
  readonly code = "OTP_STORE_UNAVAILABLE";

  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "OtpStoreUnavailableError";
    if (options?.cause) {
      Object.defineProperty(this, "cause", {
        value: options.cause,
        enumerable: false,
      });
    }
  }
}

declare global {
  var __internflowOtpStore: Map<string, OtpRecord> | undefined;
  var __internflowOtpRedisClient:
    | ReturnType<typeof createRedisClient>
    | undefined;
  var __internflowOtpRedisWarned: boolean | undefined;
  var __internflowOtpDurableWarned: boolean | undefined;
}

function getStore() {
  if (!globalThis.__internflowOtpStore) {
    globalThis.__internflowOtpStore = new Map<string, OtpRecord>();
  }

  return globalThis.__internflowOtpStore;
}

function shouldUseRedis() {
  return OTP_STORE_BACKEND === "redis" || OTP_STORE_BACKEND === "auto";
}

function shouldFailClosedOnRedisUnavailable() {
  return shouldUseRedis() && OTP_ENFORCE_DURABLE && !OTP_ALLOW_MEMORY_FALLBACK;
}

function getOtpSecret() {
  return (
    process.env.AUTH_SESSION_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "internflow-dev-otp-secret"
  );
}

function digestOtp(email: string, code: string) {
  return createHash("sha256")
    .update(`${email.toLowerCase()}::${code.trim()}::${getOtpSecret()}`)
    .digest("hex");
}

function compareDigest(expected: string, supplied: string) {
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(supplied, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function redisKey(email: string) {
  return `${OTP_REDIS_KEY_PREFIX}${email.toLowerCase()}`;
}

function getRedisClient() {
  if (!shouldUseRedis()) return null;
  if (!globalThis.__internflowOtpRedisClient) {
    globalThis.__internflowOtpRedisClient = createRedisClient("auth-otp-store");
  }
  return globalThis.__internflowOtpRedisClient;
}

function warnRedisFallback(error: unknown) {
  if (globalThis.__internflowOtpRedisWarned) return;
  globalThis.__internflowOtpRedisWarned = true;
  console.warn("[otp-store] Redis unavailable, falling back to in-memory OTP store.", error);
}

function warnDurableOtpMode() {
  if (globalThis.__internflowOtpDurableWarned) return;
  globalThis.__internflowOtpDurableWarned = true;
  console.warn(
    "[otp-store] Durable OTP mode is enabled. Redis is required; in-memory fallback is disabled.",
  );
}

async function saveOtpToRedis(email: string, digest: string, expiresAt: number) {
  const client = getRedisClient();
  if (!client) return false;
  try {
    await client.set(
      redisKey(email),
      JSON.stringify({ digest, expiresAt }),
      "EX",
      OTP_TTL_SECONDS,
    );
    return true;
  } catch (error) {
    if (shouldFailClosedOnRedisUnavailable()) {
      throw new OtpStoreUnavailableError(
        "Redis is required for OTP persistence but is unavailable while saving OTP.",
        { cause: error },
      );
    }
    warnRedisFallback(error);
    return false;
  }
}

async function readOtpFromRedis(email: string) {
  const client = getRedisClient();
  if (!client) return null;
  try {
    const raw = await client.get(redisKey(email));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OtpRecord;
    if (!parsed?.digest || !parsed?.expiresAt) return null;
    return parsed;
  } catch (error) {
    if (shouldFailClosedOnRedisUnavailable()) {
      throw new OtpStoreUnavailableError(
        "Redis is required for OTP verification but is unavailable while reading OTP.",
        { cause: error },
      );
    }
    warnRedisFallback(error);
    return null;
  }
}

async function deleteOtpFromRedis(email: string) {
  const client = getRedisClient();
  if (!client) return;
  try {
    await client.del(redisKey(email));
  } catch {
    // no-op
  }
}

export async function saveOtp(email: string, code: string) {
  const normalizedEmail = email.toLowerCase();
  const digest = digestOtp(normalizedEmail, code);
  const expiresAt = Date.now() + OTP_TTL_MS;
  if (shouldFailClosedOnRedisUnavailable()) {
    warnDurableOtpMode();
  }

  const redisSaved = await saveOtpToRedis(normalizedEmail, digest, expiresAt);
  if (redisSaved) {
    getStore().delete(normalizedEmail);
    return { backend: "redis" as const };
  }

  if (shouldFailClosedOnRedisUnavailable()) {
    throw new OtpStoreUnavailableError(
      "OTP persistence requires Redis in durable mode, but Redis write did not succeed.",
    );
  }

  getStore().set(normalizedEmail, { digest, expiresAt });
  return { backend: "memory" as const };
}

export async function verifyOtp(email: string, code: string) {
  const normalizedEmail = email.toLowerCase();
  const candidateDigest = digestOtp(normalizedEmail, code);
  const now = Date.now();
  if (shouldFailClosedOnRedisUnavailable()) {
    warnDurableOtpMode();
  }

  const redisRecord = await readOtpFromRedis(normalizedEmail);
  if (redisRecord) {
    if (now > redisRecord.expiresAt) {
      await deleteOtpFromRedis(normalizedEmail);
      return { ok: false as const, reason: "expired" };
    }
    if (!compareDigest(redisRecord.digest, candidateDigest)) {
      return { ok: false as const, reason: "invalid" };
    }
    await deleteOtpFromRedis(normalizedEmail);
    return { ok: true as const };
  }

  if (shouldFailClosedOnRedisUnavailable()) {
    return { ok: false as const, reason: "not_found" as const };
  }

  const store = getStore();
  const record = store.get(normalizedEmail);
  if (!record) return { ok: false as const, reason: "not_found" };
  if (now > record.expiresAt) {
    store.delete(normalizedEmail);
    return { ok: false as const, reason: "expired" };
  }

  if (!compareDigest(record.digest, candidateDigest)) {
    return { ok: false as const, reason: "invalid" };
  }

  store.delete(normalizedEmail);
  return { ok: true as const };
}
