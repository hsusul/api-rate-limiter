import { describe, expect, expectTypeOf, it } from "vitest";

import {
  createRateLimitResult,
  ManualClock,
  MemoryStore,
  type RateLimitAlgorithmContext,
  type RateLimitAlgorithmStrategy,
  type RateLimitResult,
} from "../../src/index.js";

class FakeAlgorithm implements RateLimitAlgorithmStrategy {
  readonly name = "fixed-window";

  async evaluate(
    context: RateLimitAlgorithmContext,
  ): Promise<RateLimitResult> {
    await context.store.increment(context.key, {
      amount: context.cost,
      ttlMs: context.policy.windowMs,
    });

    return createRateLimitResult({
      allowed: true,
      policyId: context.policy.id,
      key: context.key,
      algorithm: context.policy.algorithm,
      limit: context.policy.limit,
      remaining: context.policy.limit - context.cost,
      checkedAt: context.clock.nowDate(),
      resetAt: new Date(context.now + context.policy.windowMs),
      cost: context.cost,
    });
  }
}

describe("algorithm interface", () => {
  it("exports a pluggable algorithm strategy contract", () => {
    expectTypeOf<RateLimitAlgorithmStrategy>().toMatchTypeOf<{
      readonly name: "fixed-window" | "sliding-window";
      evaluate(context: RateLimitAlgorithmContext): Promise<RateLimitResult>;
    }>();
  });

  it("provides framework-independent context for algorithms", () => {
    expectTypeOf<RateLimitAlgorithmContext>().toMatchTypeOf<{
      readonly key: string;
      readonly policy: {
        readonly id: string;
        readonly limit: number;
        readonly windowMs: number;
        readonly algorithm: "fixed-window" | "sliding-window";
        readonly cost?: number;
      };
      readonly store: unknown;
      readonly clock: unknown;
      readonly now: number;
      readonly cost: number;
    }>();
  });

  it("allows a fake algorithm to evaluate a request and return a result", async () => {
    const clock = new ManualClock(1_000);
    const store = new MemoryStore({ clock });
    const algorithm = new FakeAlgorithm();

    const result = await algorithm.evaluate({
      key: "user:123",
      policy: {
        id: "api.default",
        limit: 10,
        windowMs: 60_000,
        algorithm: "fixed-window",
      },
      store,
      clock,
      now: clock.now(),
      cost: 2,
    });

    expect(result).toEqual({
      status: "allowed",
      allowed: true,
      policyId: "api.default",
      key: "user:123",
      algorithm: "fixed-window",
      limit: 10,
      remaining: 8,
      resetAt: new Date(61_000),
      checkedAt: new Date(1_000),
      cost: 2,
    });
    await expect(store.get<number>("user:123")).resolves.toEqual({
      value: 2,
      expiresInMs: 60_000,
      expiresAt: 61_000,
    });
  });
});
