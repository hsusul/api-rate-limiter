import type { RateLimitResult } from "./types.js";

export type { RateLimitResult, RateLimitResultStatus } from "./types.js";

export interface CreateRateLimitResultInput {
  readonly allowed: boolean;
  readonly policyId: RateLimitResult["policyId"];
  readonly key: RateLimitResult["key"];
  readonly algorithm: RateLimitResult["algorithm"];
  readonly limit: RateLimitResult["limit"];
  readonly remaining: RateLimitResult["remaining"];
  readonly resetAt: RateLimitResult["resetAt"];
  readonly checkedAt?: RateLimitResult["checkedAt"];
  readonly cost?: RateLimitResult["cost"];
  readonly retryAfterMs?: RateLimitResult["retryAfterMs"];
}

export function createRateLimitResult(
  input: CreateRateLimitResultInput,
): RateLimitResult {
  return {
    status: input.allowed ? "allowed" : "blocked",
    allowed: input.allowed,
    policyId: input.policyId,
    key: input.key,
    algorithm: input.algorithm,
    limit: input.limit,
    remaining: Math.max(0, input.remaining),
    resetAt: input.resetAt,
    checkedAt: input.checkedAt ?? new Date(),
    cost: input.cost ?? 1,
    ...(input.retryAfterMs === undefined
      ? {}
      : { retryAfterMs: Math.max(0, input.retryAfterMs) }),
  };
}

export function isRateLimitExceeded(result: RateLimitResult): boolean {
  return !result.allowed;
}
