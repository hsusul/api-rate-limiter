import type { RateLimitResult } from "../core/types.js";

export interface RateLimitHeaderOptions {
  readonly standardHeaders?: boolean;
  readonly legacyHeaders?: boolean;
}

export type HeaderMap = Readonly<Record<string, string>>;

export function createRateLimitHeaders(
  result: RateLimitResult,
  options: RateLimitHeaderOptions = {},
): HeaderMap {
  const standardHeaders = options.standardHeaders ?? true;
  const legacyHeaders = options.legacyHeaders ?? false;
  const resetSeconds = Math.ceil(result.resetAt.getTime() / 1_000).toString();
  const headers: Record<string, string> = {};

  if (standardHeaders) {
    headers["RateLimit-Limit"] = result.limit.toString();
    headers["RateLimit-Remaining"] = result.remaining.toString();
    headers["RateLimit-Reset"] = resetSeconds;
  }

  if (legacyHeaders) {
    headers["X-RateLimit-Limit"] = result.limit.toString();
    headers["X-RateLimit-Remaining"] = result.remaining.toString();
    headers["X-RateLimit-Reset"] = resetSeconds;
  }

  if (!result.allowed && result.retryAfterMs !== undefined) {
    headers["Retry-After"] = Math.ceil(result.retryAfterMs / 1_000).toString();
  }

  return headers;
}
