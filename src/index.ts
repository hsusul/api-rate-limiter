export const packageName = "api-rate-limiter";

export type {
  RateLimitAlgorithm,
  RateLimitCheck,
  RateLimitPolicy,
  RateLimitResult,
  RateLimitResultStatus,
  RateLimitSubject,
  RateLimiterErrorCode,
} from "./core/index.js";

export {
  createRateLimitResult,
  definePolicy,
  isRateLimitExceeded,
  isRateLimiterError,
  ManualClock,
  RateLimiterConfigurationError,
  RateLimiterError,
  RateLimiterPolicyError,
  SystemClock,
  systemClock,
  type Clock,
  type CreateRateLimitResultInput,
  type RateLimiterErrorOptions,
} from "./core/index.js";
