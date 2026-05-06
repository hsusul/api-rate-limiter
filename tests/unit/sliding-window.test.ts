import { describe, expect, it } from "vitest";

import {
  ManualClock,
  MemoryStore,
  RateLimiter,
  SlidingWindowAlgorithm,
  type RateLimitPolicy,
} from "../../src/index.js";

function createHarness(policyOverrides: Partial<RateLimitPolicy> = {}) {
  const clock = new ManualClock(1_000);
  const store = new MemoryStore({ clock });
  const algorithm = new SlidingWindowAlgorithm();
  const policy: RateLimitPolicy = {
    id: "api.default",
    limit: 3,
    windowMs: 1_000,
    algorithm: "sliding-window",
    ...policyOverrides,
  };

  async function check(key = "user:123", cost = 1, activePolicy = policy) {
    return algorithm.evaluate({
      key,
      policy: activePolicy,
      store,
      clock,
      now: clock.now(),
      cost,
    });
  }

  return { algorithm, check, clock, policy, store };
}

describe("SlidingWindowAlgorithm", () => {
  it("allows requests under the limit", async () => {
    const { check } = createHarness();

    await expect(check()).resolves.toMatchObject({
      allowed: true,
      limit: 3,
      remaining: 2,
      resetAt: new Date(2_000),
    });
    await expect(check()).resolves.toMatchObject({
      allowed: true,
      remaining: 1,
    });
  });

  it("blocks requests over the limit", async () => {
    const { check } = createHarness({ limit: 2 });

    await check();
    await check();

    await expect(check()).resolves.toMatchObject({
      status: "blocked",
      allowed: false,
      remaining: 0,
      resetAt: new Date(2_000),
      retryAfterMs: 1_000,
    });
  });

  it("smooths fixed-window boundary bursts", async () => {
    const { check, clock } = createHarness({ limit: 3 });

    clock.set(1_900);
    await check();
    await check();
    await check();

    clock.set(2_100);

    await expect(check()).resolves.toMatchObject({
      allowed: false,
      remaining: 0,
      resetAt: new Date(3_000),
      retryAfterMs: 900,
    });
  });

  it("calculates weighted previous-window counts", async () => {
    const { check, clock } = createHarness({ limit: 4 });

    clock.set(1_500);
    await check();
    await check();

    clock.set(2_500);

    await expect(check()).resolves.toMatchObject({
      allowed: true,
      remaining: 2,
      resetAt: new Date(3_000),
    });
  });

  it("resets after prior windows expire", async () => {
    const { check, clock } = createHarness({ limit: 2 });

    clock.set(1_900);
    await check();
    await check();

    clock.set(2_100);
    await expect(check()).resolves.toMatchObject({ allowed: false });

    clock.set(4_000);
    await expect(check()).resolves.toMatchObject({
      allowed: true,
      remaining: 1,
      resetAt: new Date(5_000),
    });
  });

  it("isolates different keys and policy IDs", async () => {
    const { check, policy } = createHarness({ limit: 1 });
    const otherPolicy: RateLimitPolicy = {
      ...policy,
      id: "api.other",
    };

    await expect(check("user:a")).resolves.toMatchObject({ allowed: true });
    await expect(check("user:a")).resolves.toMatchObject({ allowed: false });
    await expect(check("user:b")).resolves.toMatchObject({ allowed: true });
    await expect(check("user:a", 1, otherPolicy)).resolves.toMatchObject({
      allowed: true,
      policyId: "api.other",
    });
  });

  it("supports request cost", async () => {
    const { check } = createHarness({ limit: 5 });

    await expect(check("user:123", 2)).resolves.toMatchObject({
      allowed: true,
      cost: 2,
      remaining: 3,
    });
    await expect(check("user:123", 3)).resolves.toMatchObject({
      allowed: true,
      cost: 3,
      remaining: 0,
    });
    await expect(check("user:123", 1)).resolves.toMatchObject({
      allowed: false,
      cost: 1,
      remaining: 0,
    });
  });

  it("works through RateLimiter.check by default", async () => {
    const clock = new ManualClock(1_000);
    const limiter = new RateLimiter({
      store: new MemoryStore({ clock }),
      clock,
      defaultPolicy: {
        id: "api.default",
        algorithm: "sliding-window",
        limit: 1,
        windowMs: 1_000,
      },
    });

    await expect(limiter.check({ key: "user:123" })).resolves.toMatchObject({
      allowed: true,
      algorithm: "sliding-window",
    });
    await expect(limiter.check({ key: "user:123" })).resolves.toMatchObject({
      allowed: false,
      retryAfterMs: 1_000,
    });
  });
});
