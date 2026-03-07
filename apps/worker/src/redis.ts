import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

function retryStrategy(times: number) {
  return Math.min(times * 250, 5_000);
}

export function createRedisConnection(name: string) {
  const connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
    lazyConnect: false,
    keepAlive: 30_000,
    connectTimeout: 10_000,
    retryStrategy,
    reconnectOnError: () => true,
    connectionName: name,
  });

  connection.on("error", (error) => {
    console.error(`[redis:${name}]`, error?.message ?? error);
  });

  connection.on("reconnecting", (ms: number) => {
    console.warn(`[redis:${name}] reconnecting in ${ms}ms`);
  });

  return connection;
}
