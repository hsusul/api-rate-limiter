import type { RateLimitPolicy } from "./types.js";

export type { RateLimitAlgorithm, RateLimitPolicy } from "./types.js";

export function definePolicy(policy: RateLimitPolicy): RateLimitPolicy {
  return policy;
}
