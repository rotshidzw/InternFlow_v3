import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

function retryStrategy(times: number) {
  return Math.min(times * 200, 3_000);
}

export function createRedisClient(name: string) {
  const client = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: false,
    keepAlive: 30_000,
    connectTimeout: 10_000,
    retryStrategy,
    reconnectOnError: () => true,
    connectionName: name,
  });

  client.on("error", (error) => {
    console.error(`[redis:${name}]`, error?.message ?? error);
  });

  return client;
}
