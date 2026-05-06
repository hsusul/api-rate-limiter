import { createRateLimitResult } from "../core/result.js";
import type { RateLimitResult } from "../core/types.js";
import type {
  RateLimitAlgorithmContext,
  RateLimitAlgorithmStrategy,
} from "./algorithm.js";

export class SlidingWindowAlgorithm implements RateLimitAlgorithmStrategy {
  readonly name = "sliding-window";

  async evaluate(
    context: RateLimitAlgorithmContext,
  ): Promise<RateLimitResult> {
    const windowStart = this.#windowStart(context.now, context.policy.windowMs);
    const previousWindowStart = windowStart - context.policy.windowMs;
    const elapsedInWindow = context.now - windowStart;
    const previousWeight =
      (context.policy.windowMs - elapsedInWindow) / context.policy.windowMs;
    const previousCounter = await context.store.get<number>(
      this.#storeKey(context, previousWindowStart),
    );
    const currentCounter = await context.store.increment(
      this.#storeKey(context, windowStart),
      {
        amount: context.cost,
        ttlMs: context.policy.windowMs * 2,
      },
    );
    const estimatedCount =
      (previousCounter?.value ?? 0) * previousWeight + currentCounter.value;
    const allowed = estimatedCount <= context.policy.limit;
    const resetAtMs = windowStart + context.policy.windowMs;
    const retryAfterMs = allowed ? undefined : resetAtMs - context.now;

    return createRateLimitResult({
      allowed,
      policyId: context.policy.id,
      key: context.key,
      algorithm: this.name,
      limit: context.policy.limit,
      remaining: Math.max(0, Math.floor(context.policy.limit - estimatedCount)),
      checkedAt: new Date(context.now),
      resetAt: new Date(resetAtMs),
      cost: context.cost,
      ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
    });
  }

  #windowStart(now: number, windowMs: number): number {
    return Math.floor(now / windowMs) * windowMs;
  }

  #storeKey(context: RateLimitAlgorithmContext, windowStart: number): string {
    return `${this.name}:${context.policy.id}:${context.key}:${windowStart}`;
  }
}
