import { describe, expect, it } from "vitest";

import { createRateLimitHeaders, createRateLimitResult } from "../../src/index.js";

describe("createRateLimitHeaders", () => {
  it("creates standard rate limit headers for allowed results", () => {
    const result = createRateLimitResult({
      allowed: true,
      policyId: "api.default",
      key: "user:123",
      algorithm: "fixed-window",
      limit: 10,
      remaining: 7,
      checkedAt: new Date(1_000),
      resetAt: new Date(61_000),
    });

    expect(createRateLimitHeaders(result)).toEqual({
      "RateLimit-Limit": "10",
      "RateLimit-Remaining": "7",
      "RateLimit-Reset": "61",
    });
  });

  it("adds Retry-After for blocked results", () => {
    const result = createRateLimitResult({
      allowed: false,
      policyId: "api.default",
      key: "user:123",
      algorithm: "fixed-window",
      limit: 10,
      remaining: 0,
      checkedAt: new Date(1_000),
      resetAt: new Date(61_000),
      retryAfterMs: 60_000,
    });

    expect(createRateLimitHeaders(result)).toMatchObject({
      "Retry-After": "60",
    });
  });

  it("can emit legacy headers", () => {
    const result = createRateLimitResult({
      allowed: true,
      policyId: "api.default",
      key: "user:123",
      algorithm: "fixed-window",
      limit: 10,
      remaining: 7,
      checkedAt: new Date(1_000),
      resetAt: new Date(61_000),
    });

    expect(
      createRateLimitHeaders(result, {
        standardHeaders: false,
        legacyHeaders: true,
      }),
    ).toEqual({
      "X-RateLimit-Limit": "10",
      "X-RateLimit-Remaining": "7",
      "X-RateLimit-Reset": "61",
    });
  });
});
