import { describe, expect, it } from "vitest";

import {
  FixedWindowAlgorithm,
  ManualClock,
  MemoryStore,
  RateLimiter,
  RateLimiterPolicyError,
  type RateLimitAlgorithmContext,
  type RateLimitAlgorithmStrategy,
  type RateLimitPolicy,
  type RateLimitResult,
} from "../../src/index.js";

function createPolicy(overrides: Partial<RateLimitPolicy> = {}): RateLimitPolicy {
  return {
    id: "api.default",
    limit: 2,
    windowMs: 1_000,
    algorithm: "fixed-window",
    ...overrides,
  };
}

describe("RateLimiter", () => {
  it("delegates check calls to the fixed window algorithm", async () => {
    const clock = new ManualClock(1_000);
    const limiter = new RateLimiter({
      store: new MemoryStore({ clock }),
      clock,
      defaultPolicy: createPolicy(),
    });

    await expect(limiter.check({ key: "user:123" })).resolves.toMatchObject({
      allowed: true,
      policyId: "api.default",
      key: "user:123",
      algorithm: "fixed-window",
      limit: 2,
      remaining: 1,
      resetAt: new Date(2_000),
    });
    await expect(limiter.check({ key: "user:123" })).resolves.toMatchObject({
      allowed: true,
      remaining: 0,
    });
    await expect(limiter.check({ key: "user:123" })).resolves.toMatchObject({
      allowed: false,
      remaining: 0,
      retryAfterMs: 1_000,
    });
  });

  it("uses a provided policy over the default policy", async () => {
    const clock = new ManualClock(1_000);
    const limiter = new RateLimiter({
      store: new MemoryStore({ clock }),
      clock,
      defaultPolicy: createPolicy({ id: "api.default", limit: 1 }),
    });

    await expect(
      limiter.check({
        key: "user:123",
        policy: createPolicy({ id: "api.custom", limit: 3 }),
      }),
    ).resolves.toMatchObject({
      allowed: true,
      policyId: "api.custom",
      limit: 3,
      remaining: 2,
    });
  });

  it("uses the default policy when no policy is provided", async () => {
    const clock = new ManualClock(1_000);
    const limiter = new RateLimiter({
      store: new MemoryStore({ clock }),
      clock,
      defaultPolicy: createPolicy({ id: "api.default" }),
    });

    await expect(limiter.check({ key: "user:123" })).resolves.toMatchObject({
      policyId: "api.default",
      allowed: true,
    });
  });

  it("throws a clear error when no policy is available", async () => {
    const limiter = new RateLimiter({
      store: new MemoryStore({ clock: new ManualClock() }),
    });

    await expect(limiter.check({ key: "user:123" })).rejects.toMatchObject({
      name: "RateLimiterPolicyError",
      code: "RATE_LIMITER_POLICY_ERROR",
      message: "RateLimiter.check requires a policy or a defaultPolicy.",
    });
  });

  it("throws a clear error for an unknown algorithm", async () => {
    const limiter = new RateLimiter({
      store: new MemoryStore({ clock: new ManualClock() }),
      algorithms: [new FixedWindowAlgorithm()],
      defaultPolicy: createPolicy({ algorithm: "sliding-window" }),
    });

    await expect(limiter.check({ key: "user:123" })).rejects.toThrow(
      RateLimiterPolicyError,
    );
    await expect(limiter.check({ key: "user:123" })).rejects.toMatchObject({
      code: "RATE_LIMITER_POLICY_ERROR",
      message: 'No rate limit algorithm registered for "sliding-window".',
    });
  });

  it("passes custom key and policy inputs through to the algorithm", async () => {
    const clock = new ManualClock(5_000);
    const limiter = new RateLimiter({
      store: new MemoryStore({ clock }),
      clock,
    });

    await expect(
      limiter.check({
        key: "tenant:abc",
        policy: createPolicy({
          id: "tenant.policy",
          limit: 10,
          windowMs: 2_000,
        }),
      }),
    ).resolves.toMatchObject({
      allowed: true,
      key: "tenant:abc",
      policyId: "tenant.policy",
      limit: 10,
      remaining: 9,
      checkedAt: new Date(5_000),
      resetAt: new Date(7_000),
    });
  });

  it("passes request cost through and falls back to policy cost", async () => {
    const clock = new ManualClock(1_000);
    const limiter = new RateLimiter({
      store: new MemoryStore({ clock }),
      clock,
      defaultPolicy: createPolicy({ limit: 5, cost: 2 }),
    });

    await expect(limiter.check({ key: "user:123" })).resolves.toMatchObject({
      cost: 2,
      remaining: 3,
    });
    await expect(
      limiter.check({ key: "user:123", cost: 3 }),
    ).resolves.toMatchObject({
      cost: 3,
      remaining: 0,
    });
  });

  it("can use a custom framework-independent algorithm strategy", async () => {
    class CustomAlgorithm implements RateLimitAlgorithmStrategy {
      readonly name = "fixed-window";

      async evaluate(
        context: RateLimitAlgorithmContext,
      ): Promise<RateLimitResult> {
        return {
          status: "allowed",
          allowed: true,
          policyId: context.policy.id,
          key: context.key,
          algorithm: context.policy.algorithm,
          limit: context.policy.limit,
          remaining: context.policy.limit - context.cost,
          resetAt: new Date(context.now + context.policy.windowMs),
          checkedAt: context.clock.nowDate(),
          cost: context.cost,
        };
      }
    }

    const clock = new ManualClock(2_000);
    const limiter = new RateLimiter({
      store: new MemoryStore({ clock }),
      clock,
      algorithms: [new CustomAlgorithm()],
      defaultPolicy: createPolicy({ limit: 10 }),
    });

    await expect(
      limiter.check({ key: "custom:user", cost: 4 }),
    ).resolves.toEqual({
      status: "allowed",
      allowed: true,
      policyId: "api.default",
      key: "custom:user",
      algorithm: "fixed-window",
      limit: 10,
      remaining: 6,
      resetAt: new Date(3_000),
      checkedAt: new Date(2_000),
      cost: 4,
    });
  });
});
