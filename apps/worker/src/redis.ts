import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const REDIS_MAX_RECONNECT_ATTEMPTS = Number(
  process.env.REDIS_MAX_RECONNECT_ATTEMPTS ??
    (process.env.NODE_ENV === "production" ? 100 : 8),
);

function retryStrategy(times: number) {
  if (times > REDIS_MAX_RECONNECT_ATTEMPTS) {
    return null;
  }

  return Math.min(times * 250, 5_000);
}

function isExpectedConnectionError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as Error & { code?: string };
  const code = maybeError.code ?? "";
  const message = maybeError.message ?? "";
  return (
    code === "ECONNREFUSED" ||
    code === "ECONNRESET" ||
    code === "ECONNABORTED" ||
    message.includes("ECONNREFUSED") ||
    message.includes("ECONNRESET") ||
    message.includes("ECONNABORTED")
  );
}

export function createRedisConnection(name: string) {
  const connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    lazyConnect: false,
    keepAlive: 30_000,
    connectTimeout: 10_000,
    retryStrategy,
    reconnectOnError: () => true,
    connectionName: name,
    family: 4,
  });

  connection.on("error", (error) => {
    if (isExpectedConnectionError(error)) {
      console.warn(
        `[redis:${name}] connection unavailable (${(error as Error).message}). Ensure Redis is running or set REDIS_URL to your reachable instance.`,
      );
      return;
    }

    console.error(`[redis:${name}]`, error?.message ?? error);
  });

  connection.on("close", () => {
    console.warn(`[redis:${name}] connection closed`);
  });

  connection.on("reconnecting", (ms: number) => {
    console.warn(`[redis:${name}] reconnecting in ${ms}ms`);
  });

  connection.on("end", () => {
    console.error(
      `[redis:${name}] reconnect attempts exhausted. Set REDIS_MAX_RECONNECT_ATTEMPTS to increase retries.`,
    );
  });

  return connection;
}
