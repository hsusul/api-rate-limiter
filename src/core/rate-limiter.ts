import { FixedWindowAlgorithm } from "../algorithms/fixed-window.js";
import type { RateLimitAlgorithmStrategy } from "../algorithms/index.js";
import { SlidingWindowAlgorithm } from "../algorithms/sliding-window.js";
import type { Store } from "../stores/store.js";
import { systemClock, type Clock } from "./clock.js";
import { createRateLimitResult } from "./result.js";
import { RateLimiterPolicyError } from "./errors.js";
import type {
  RateLimitAlgorithm,
  RateLimitFailureBehavior,
  RateLimitPolicy,
  RateLimitResult,
  RateLimitSubject,
} from "./types.js";

export interface RateLimiterOptions {
  readonly store: Store;
  readonly clock?: Clock;
  readonly algorithms?: readonly RateLimitAlgorithmStrategy[];
  readonly defaultPolicy?: RateLimitPolicy;
  readonly failureBehavior?: RateLimitFailureBehavior;
}

export interface RateLimiterCheckInput {
  readonly key: RateLimitSubject;
  readonly policy?: RateLimitPolicy;
  readonly cost?: number;
  readonly now?: number;
}

export class RateLimiter {
  readonly #store: Store;

  readonly #clock: Clock;

  readonly #algorithms: Map<RateLimitAlgorithm, RateLimitAlgorithmStrategy>;

  readonly #defaultPolicy: RateLimitPolicy | undefined;

  readonly #failureBehavior: RateLimitFailureBehavior;

  constructor(options: RateLimiterOptions) {
    this.#store = options.store;
    this.#clock = options.clock ?? systemClock;
    this.#defaultPolicy = options.defaultPolicy;
    this.#failureBehavior = options.failureBehavior ?? "fail-open";
    this.#algorithms = new Map(
      (
        options.algorithms ?? [
          new FixedWindowAlgorithm(),
          new SlidingWindowAlgorithm(),
        ]
      ).map((algorithm) => [algorithm.name, algorithm]),
    );
  }

  async check(input: RateLimiterCheckInput): Promise<RateLimitResult> {
    const policy = input.policy ?? this.#defaultPolicy;

    if (policy === undefined) {
      throw new RateLimiterPolicyError(
        "RateLimiter.check requires a policy or a defaultPolicy.",
      );
    }

    const algorithm = this.#algorithms.get(policy.algorithm);

    if (algorithm === undefined) {
      throw new RateLimiterPolicyError(
        `No rate limit algorithm registered for "${policy.algorithm}".`,
      );
    }

    const now = input.now ?? this.#clock.now();
    const cost = input.cost ?? policy.cost ?? 1;

    try {
      return await algorithm.evaluate({
        key: input.key,
        policy,
        store: this.#store,
        clock: this.#clock,
        now,
        cost,
      });
    } catch (error) {
      return this.#createFailureResult({
        error,
        key: input.key,
        policy,
        now,
        cost,
      });
    }
  }

  #createFailureResult(input: {
    readonly error: unknown;
    readonly key: RateLimitSubject;
    readonly policy: RateLimitPolicy;
    readonly now: number;
    readonly cost: number;
  }): RateLimitResult {
    const allowed = this.#failureBehavior === "fail-open";
    const resetAt = new Date(input.now + input.policy.windowMs);

    return createRateLimitResult({
      allowed,
      policyId: input.policy.id,
      key: input.key,
      algorithm: input.policy.algorithm,
      limit: input.policy.limit,
      remaining: allowed ? input.policy.limit : 0,
      checkedAt: new Date(input.now),
      resetAt,
      cost: input.cost,
      ...(allowed ? {} : { retryAfterMs: input.policy.windowMs }),
      failure: {
        behavior: this.#failureBehavior,
        errorName: errorName(input.error),
        message: errorMessage(input.error),
      },
    });
  }
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "Error";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown rate limiter failure.";
}
