export const defaultRedisUrl = "redis://127.0.0.1:6379";

export const redisUrl = process.env.REDIS_URL ?? defaultRedisUrl;

export const redisIntegrationSkipReason =
  "RedisStore is not implemented yet. This scaffold documents the future integration contract.";

export interface RedisIntegrationConfig {
  readonly url: string;
}

export function getRedisIntegrationConfig(): RedisIntegrationConfig {
  return {
    url: redisUrl,
  };
}
