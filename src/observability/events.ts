import type { RateLimitAlgorithm, RateLimitResult } from "../core/types.js";

export type RateLimiterEventKind = "allow" | "block" | "error";

export interface SafeRateLimitKey {
  readonly hash: string;
}

export interface RateLimiterEvent {
  readonly kind: RateLimiterEventKind;
  readonly policyId: string;
  readonly algorithm: RateLimitAlgorithm;
  readonly key: SafeRateLimitKey;
  readonly result: RateLimitResult;
  readonly latencyMs: number;
}

export interface RateLimiterHooks {
  readonly onAllow?: (event: RateLimiterEvent) => void | Promise<void>;
  readonly onBlock?: (event: RateLimiterEvent) => void | Promise<void>;
  readonly onError?: (event: RateLimiterEvent) => void | Promise<void>;
  readonly throwOnHookError?: boolean;
}

export function hashRateLimitKey(key: string): string {
  let hash = 2_166_136_261;

  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}
