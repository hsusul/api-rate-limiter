import type { Clock } from "../core/clock.js";
import type {
  RateLimitPolicy,
  RateLimitResult,
  RateLimitSubject,
} from "../core/types.js";
import type { Store } from "../stores/store.js";

export interface RateLimitAlgorithmContext {
  readonly key: RateLimitSubject;
  readonly policy: RateLimitPolicy;
  readonly store: Store;
  readonly clock: Clock;
  readonly now: number;
  readonly cost: number;
}

export interface RateLimitAlgorithmStrategy {
  readonly name: RateLimitPolicy["algorithm"];

  evaluate(context: RateLimitAlgorithmContext): Promise<RateLimitResult>;
}
