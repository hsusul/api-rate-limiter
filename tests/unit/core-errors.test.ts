import { describe, expect, expectTypeOf, it } from "vitest";

import {
  isRateLimiterError,
  RateLimiterConfigurationError,
  RateLimiterError,
  type RateLimiterErrorCode,
  RateLimiterPolicyError,
} from "../../src/index.js";

describe("core public errors", () => {
  it("exports typed error codes", () => {
    expectTypeOf<RateLimiterErrorCode>().toEqualTypeOf<
      | "RATE_LIMITER_CONFIGURATION_ERROR"
      | "RATE_LIMITER_POLICY_ERROR"
      | "RATE_LIMITER_INTERNAL_ERROR"
    >();
  });

  it("creates configuration errors with stable code and name", () => {
    const cause = new Error("invalid value");
    const error = new RateLimiterConfigurationError("Bad config", cause);

    expect(error).toBeInstanceOf(RateLimiterError);
    expect(error.name).toBe("RateLimiterConfigurationError");
    expect(error.message).toBe("Bad config");
    expect(error.code).toBe("RATE_LIMITER_CONFIGURATION_ERROR");
    expect(error.cause).toBe(cause);
    expect(isRateLimiterError(error)).toBe(true);
  });

  it("creates policy errors with stable code and name", () => {
    const error = new RateLimiterPolicyError("Bad policy");

    expect(error).toBeInstanceOf(RateLimiterError);
    expect(error.name).toBe("RateLimiterPolicyError");
    expect(error.message).toBe("Bad policy");
    expect(error.code).toBe("RATE_LIMITER_POLICY_ERROR");
    expect(error.cause).toBeUndefined();
    expect(isRateLimiterError(error)).toBe(true);
  });

  it("does not classify unrelated errors as rate limiter errors", () => {
    expect(isRateLimiterError(new Error("nope"))).toBe(false);
    expect(isRateLimiterError("nope")).toBe(false);
  });
});
