import { describe, expect, expectTypeOf, it } from "vitest";

import {
  createRateLimitResult,
  definePolicy,
  isRateLimitExceeded,
  type RateLimitAlgorithm,
  type RateLimitCheck,
  type RateLimitPolicy,
  type RateLimitResult,
} from "../../src/index.js";

describe("core public types", () => {
  it("exports framework-independent policy types", () => {
    expectTypeOf<RateLimitAlgorithm>().toEqualTypeOf<
      "fixed-window" | "sliding-window"
    >();

    expectTypeOf<RateLimitPolicy>().toMatchTypeOf<{
      readonly id: string;
      readonly limit: number;
      readonly windowMs: number;
      readonly algorithm: RateLimitAlgorithm;
      readonly cost?: number;
    }>();

    const policy = definePolicy({
      id: "api.default",
      limit: 100,
      windowMs: 60_000,
      algorithm: "fixed-window",
    });

    expect(policy).toEqual({
      id: "api.default",
      limit: 100,
      windowMs: 60_000,
      algorithm: "fixed-window",
    });
  });

  it("exports framework-independent check and result types", () => {
    expectTypeOf<RateLimitCheck>().toMatchTypeOf<{
      readonly key: string;
      readonly policy: RateLimitPolicy;
      readonly cost?: number;
      readonly now?: number;
    }>();

    expectTypeOf<RateLimitResult>().toMatchTypeOf<{
      readonly status: "allowed" | "blocked";
      readonly allowed: boolean;
      readonly policyId: string;
      readonly key: string;
      readonly algorithm: RateLimitAlgorithm;
      readonly limit: number;
      readonly remaining: number;
      readonly resetAt: Date;
      readonly checkedAt: Date;
      readonly cost: number;
      readonly retryAfterMs?: number;
    }>();
  });

  it("creates allowed result objects", () => {
    const checkedAt = new Date("2026-05-06T12:00:00.000Z");
    const resetAt = new Date("2026-05-06T12:01:00.000Z");

    const result = createRateLimitResult({
      allowed: true,
      policyId: "api.default",
      key: "user:123",
      algorithm: "fixed-window",
      limit: 100,
      remaining: 99,
      resetAt,
      checkedAt,
    });

    expect(result).toEqual({
      status: "allowed",
      allowed: true,
      policyId: "api.default",
      key: "user:123",
      algorithm: "fixed-window",
      limit: 100,
      remaining: 99,
      resetAt,
      checkedAt,
      cost: 1,
    });
    expect(isRateLimitExceeded(result)).toBe(false);
  });

  it("creates blocked result objects with retry metadata", () => {
    const checkedAt = new Date("2026-05-06T12:00:00.000Z");
    const resetAt = new Date("2026-05-06T12:01:00.000Z");

    const result = createRateLimitResult({
      allowed: false,
      policyId: "api.default",
      key: "user:123",
      algorithm: "sliding-window",
      limit: 100,
      remaining: -3,
      resetAt,
      checkedAt,
      cost: 2,
      retryAfterMs: -10,
    });

    expect(result).toEqual({
      status: "blocked",
      allowed: false,
      policyId: "api.default",
      key: "user:123",
      algorithm: "sliding-window",
      limit: 100,
      remaining: 0,
      resetAt,
      checkedAt,
      cost: 2,
      retryAfterMs: 0,
    });
    expect(isRateLimitExceeded(result)).toBe(true);
  });
});
