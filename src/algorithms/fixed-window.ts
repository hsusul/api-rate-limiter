import { createRateLimitResult } from "../core/result.js";
import type { RateLimitResult } from "../core/types.js";
import type {
  RateLimitAlgorithmContext,
  RateLimitAlgorithmStrategy,
} from "./algorithm.js";

export class FixedWindowAlgorithm implements RateLimitAlgorithmStrategy {
  readonly name = "fixed-window";

  async evaluate(
    context: RateLimitAlgorithmContext,
  ): Promise<RateLimitResult> {
    const counter = await context.store.increment(this.#storeKey(context), {
      amount: context.cost,
      ttlMs: context.policy.windowMs,
    });
    const allowed = counter.value <= context.policy.limit;
    const resetAtMs =
      counter.expiresInMs === undefined
        ? counter.expiresAt ?? context.now + context.policy.windowMs
        : context.now + counter.expiresInMs;
    const retryAfterMs = allowed ? undefined : resetAtMs - context.now;

    return createRateLimitResult({
      allowed,
      policyId: context.policy.id,
      key: context.key,
      algorithm: this.name,
      limit: context.policy.limit,
      remaining: Math.max(0, context.policy.limit - counter.value),
      checkedAt: new Date(context.now),
      resetAt: new Date(resetAtMs),
      cost: context.cost,
      ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
    });
  }

  #storeKey(context: RateLimitAlgorithmContext): string {
    return `${this.name}:${context.policy.id}:${context.key}`;
  }
}
