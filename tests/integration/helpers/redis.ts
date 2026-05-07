export const defaultRedisUrl = "redis://127.0.0.1:6379";

export const redisUrl = process.env.REDIS_URL ?? defaultRedisUrl;

export const redisIntegrationSkipReason =
  "Set RUN_REDIS_TESTS=1 and start Redis with `docker compose up -d redis`.";

export interface RedisIntegrationConfig {
  readonly url: string;
}

export function getRedisIntegrationConfig(): RedisIntegrationConfig {
  return {
    url: redisUrl,
  };
}

export const shouldRunRedisIntegrationTests = process.env.RUN_REDIS_TESTS === "1";

export function redisUnavailableMessage(cause: unknown): string {
  const detail = cause instanceof Error ? cause.message : "unknown error";

  return `Redis integration tests require a reachable Redis server at ${redisUrl}. ${redisIntegrationSkipReason} Cause: ${detail}`;
}
