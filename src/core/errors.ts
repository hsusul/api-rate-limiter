import type { RateLimiterErrorCode } from "./types.js";

export type { RateLimiterErrorCode } from "./types.js";

export interface RateLimiterErrorOptions {
  readonly code: RateLimiterErrorCode;
  readonly cause?: unknown;
}

export class RateLimiterError extends Error {
  readonly code: RateLimiterErrorCode;

  override readonly cause?: unknown;

  constructor(message: string, options: RateLimiterErrorOptions) {
    super(message);
    this.name = "RateLimiterError";
    this.code = options.code;

    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export class RateLimiterConfigurationError extends RateLimiterError {
  constructor(message: string, cause?: unknown) {
    super(message, {
      code: "RATE_LIMITER_CONFIGURATION_ERROR",
      ...(cause === undefined ? {} : { cause }),
    });
    this.name = "RateLimiterConfigurationError";
  }
}

export class RateLimiterPolicyError extends RateLimiterError {
  constructor(message: string, cause?: unknown) {
    super(message, {
      code: "RATE_LIMITER_POLICY_ERROR",
      ...(cause === undefined ? {} : { cause }),
    });
    this.name = "RateLimiterPolicyError";
  }
}

export function isRateLimiterError(error: unknown): error is RateLimiterError {
  return error instanceof RateLimiterError;
}
