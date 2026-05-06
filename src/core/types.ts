export type RateLimitAlgorithm = "fixed-window" | "sliding-window";

export type RateLimitSubject = string;

export interface RateLimitPolicy {
  readonly id: string;
  readonly limit: number;
  readonly windowMs: number;
  readonly algorithm: RateLimitAlgorithm;
  readonly cost?: number;
}

export interface RateLimitCheck {
  readonly key: RateLimitSubject;
  readonly policy: RateLimitPolicy;
  readonly cost?: number;
  readonly now?: number;
}

export type RateLimitResultStatus = "allowed" | "blocked";

export type RateLimitFailureBehavior = "fail-open" | "fail-closed";

export interface RateLimitFailure {
  readonly behavior: RateLimitFailureBehavior;
  readonly errorName: string;
  readonly message: string;
}

export interface RateLimitResult {
  readonly status: RateLimitResultStatus;
  readonly allowed: boolean;
  readonly policyId: string;
  readonly key: RateLimitSubject;
  readonly algorithm: RateLimitAlgorithm;
  readonly limit: number;
  readonly remaining: number;
  readonly resetAt: Date;
  readonly checkedAt: Date;
  readonly cost: number;
  readonly retryAfterMs?: number;
  readonly failure?: RateLimitFailure;
}

export type RateLimiterErrorCode =
  | "RATE_LIMITER_CONFIGURATION_ERROR"
  | "RATE_LIMITER_POLICY_ERROR"
  | "RATE_LIMITER_INTERNAL_ERROR";
