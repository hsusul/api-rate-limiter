import { FixedWindowAlgorithm } from "../algorithms/fixed-window.js";
import type { RateLimitAlgorithmStrategy } from "../algorithms/index.js";
import type { Store } from "../stores/store.js";
import { systemClock, type Clock } from "./clock.js";
import { RateLimiterPolicyError } from "./errors.js";
import type {
  RateLimitAlgorithm,
  RateLimitPolicy,
  RateLimitResult,
  RateLimitSubject,
} from "./types.js";

export interface RateLimiterOptions {
  readonly store: Store;
  readonly clock?: Clock;
  readonly algorithms?: readonly RateLimitAlgorithmStrategy[];
  readonly defaultPolicy?: RateLimitPolicy;
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

  constructor(options: RateLimiterOptions) {
    this.#store = options.store;
    this.#clock = options.clock ?? systemClock;
    this.#defaultPolicy = options.defaultPolicy;
    this.#algorithms = new Map(
      (options.algorithms ?? [new FixedWindowAlgorithm()]).map((algorithm) => [
        algorithm.name,
        algorithm,
      ]),
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

    return algorithm.evaluate({
      key: input.key,
      policy,
      store: this.#store,
      clock: this.#clock,
      now: input.now ?? this.#clock.now(),
      cost: input.cost ?? policy.cost ?? 1,
    });
  }
}
