import { describe, expect, it } from "vitest";

import {
  FixedWindowAlgorithm,
  ManualClock,
  MemoryStore,
  type RateLimitPolicy,
} from "../../src/index.js";

function createHarness(policyOverrides: Partial<RateLimitPolicy> = {}) {
  const clock = new ManualClock(1_000);
  const store = new MemoryStore({ clock });
  const algorithm = new FixedWindowAlgorithm();
  const policy: RateLimitPolicy = {
    id: "api.default",
    limit: 3,
    windowMs: 1_000,
    algorithm: "fixed-window",
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

describe("FixedWindowAlgorithm", () => {
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
      limit: 3,
      remaining: 1,
      resetAt: new Date(2_000),
    });
  });

  it("allows exactly the limit", async () => {
    const { check } = createHarness();

    await check();
    await check();

    await expect(check()).resolves.toMatchObject({
      status: "allowed",
      allowed: true,
      limit: 3,
      remaining: 0,
      resetAt: new Date(2_000),
    });
  });

  it("blocks limit plus one with retry metadata", async () => {
    const { check } = createHarness();

    await check();
    await check();
    await check();

    await expect(check()).resolves.toMatchObject({
      status: "blocked",
      allowed: false,
      limit: 3,
      remaining: 0,
      resetAt: new Date(2_000),
      retryAfterMs: 1_000,
    });
  });

  it("resets after windowMs", async () => {
    const { check, clock } = createHarness();

    await check();
    await check();
    await check();
    await expect(check()).resolves.toMatchObject({ allowed: false });

    clock.advance(1_000);

    await expect(check()).resolves.toMatchObject({
      allowed: true,
      remaining: 2,
      resetAt: new Date(3_000),
    });
  });

  it("isolates different keys", async () => {
    const { check } = createHarness({ limit: 1 });

    await expect(check("user:a")).resolves.toMatchObject({
      allowed: true,
      remaining: 0,
    });
    await expect(check("user:a")).resolves.toMatchObject({
      allowed: false,
      remaining: 0,
      retryAfterMs: 1_000,
    });
    await expect(check("user:b")).resolves.toMatchObject({
      allowed: true,
      remaining: 0,
    });
  });

  it("isolates different policy IDs", async () => {
    const { check, policy } = createHarness({ limit: 1 });
    const otherPolicy: RateLimitPolicy = {
      ...policy,
      id: "api.other",
    };

    await expect(check("user:123", 1, policy)).resolves.toMatchObject({
      allowed: true,
      policyId: "api.default",
    });
    await expect(check("user:123", 1, policy)).resolves.toMatchObject({
      allowed: false,
      policyId: "api.default",
    });
    await expect(check("user:123", 1, otherPolicy)).resolves.toMatchObject({
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
      retryAfterMs: 1_000,
    });
  });

  it("returns complete result metadata", async () => {
    const { check } = createHarness();

    await expect(check("user:123", 2)).resolves.toEqual({
      status: "allowed",
      allowed: true,
      policyId: "api.default",
      key: "user:123",
      algorithm: "fixed-window",
      limit: 3,
      remaining: 1,
      checkedAt: new Date(1_000),
      resetAt: new Date(2_000),
      cost: 2,
    });
  });
});
