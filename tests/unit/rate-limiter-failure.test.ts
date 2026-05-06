import { describe, expect, it } from "vitest";

import {
  ManualClock,
  MemoryStore,
  RateLimiter,
  type RateLimitAlgorithmContext,
  type RateLimitAlgorithmStrategy,
  type RateLimitPolicy,
} from "../../src/index.js";

const policy: RateLimitPolicy = {
  id: "api.default",
  algorithm: "fixed-window",
  limit: 10,
  windowMs: 1_000,
};

class FailingAlgorithm implements RateLimitAlgorithmStrategy {
  readonly name = "fixed-window";

  async evaluate(_context: RateLimitAlgorithmContext) {
    throw new Error("store unavailable");
  }
}

describe("RateLimiter failure behavior", () => {
  it("defaults to fail-open for storage or algorithm failures", async () => {
    const clock = new ManualClock(1_000);
    const limiter = new RateLimiter({
      store: new MemoryStore({ clock }),
      clock,
      algorithms: [new FailingAlgorithm()],
      defaultPolicy: policy,
    });

    await expect(limiter.check({ key: "user:123" })).resolves.toEqual({
      status: "allowed",
      allowed: true,
      policyId: "api.default",
      key: "user:123",
      algorithm: "fixed-window",
      limit: 10,
      remaining: 10,
      checkedAt: new Date(1_000),
      resetAt: new Date(2_000),
      cost: 1,
      failure: {
        behavior: "fail-open",
        errorName: "Error",
        message: "store unavailable",
      },
    });
  });

  it("can fail closed for storage or algorithm failures", async () => {
    const clock = new ManualClock(1_000);
    const limiter = new RateLimiter({
      store: new MemoryStore({ clock }),
      clock,
      algorithms: [new FailingAlgorithm()],
      defaultPolicy: policy,
      failureBehavior: "fail-closed",
    });

    await expect(limiter.check({ key: "user:123", cost: 2 })).resolves.toEqual({
      status: "blocked",
      allowed: false,
      policyId: "api.default",
      key: "user:123",
      algorithm: "fixed-window",
      limit: 10,
      remaining: 0,
      checkedAt: new Date(1_000),
      resetAt: new Date(2_000),
      cost: 2,
      retryAfterMs: 1_000,
      failure: {
        behavior: "fail-closed",
        errorName: "Error",
        message: "store unavailable",
      },
    });
  });

  it("does not convert policy configuration errors into failure results", async () => {
    const limiter = new RateLimiter({
      store: new MemoryStore({ clock: new ManualClock() }),
      failureBehavior: "fail-open",
    });

    await expect(limiter.check({ key: "user:123" })).rejects.toMatchObject({
      code: "RATE_LIMITER_POLICY_ERROR",
    });
  });
});
