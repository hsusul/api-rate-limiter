export const packageName = "api-rate-limiter";

export type {
  RateLimitAlgorithm,
  RateLimitCheck,
  RateLimitFailure,
  RateLimitFailureBehavior,
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
  RateLimiter,
  RateLimiterConfigurationError,
  RateLimiterError,
  RateLimiterPolicyError,
  SystemClock,
  systemClock,
  type Clock,
  type CreateRateLimitResultInput,
  type RateLimiterCheckInput,
  type RateLimiterErrorOptions,
  type RateLimiterOptions,
} from "./core/index.js";

export type {
  Store,
  StoreEntry,
  StoreIncrementOptions,
  StoreIncrementResult,
  StoreSetOptions,
  StoreValue,
} from "./stores/index.js";

export {
  MemoryStore,
  RedisStore,
  type MemoryStoreOptions,
  type RedisStoreOptions,
} from "./stores/index.js";

export type {
  RateLimitAlgorithmContext,
  RateLimitAlgorithmStrategy,
} from "./algorithms/index.js";

export {
  FixedWindowAlgorithm,
  SlidingWindowAlgorithm,
} from "./algorithms/index.js";

export {
  createRateLimitHeaders,
  defaultKeyGenerator,
  expressRateLimit,
  type ExpressRateLimitOptions,
  type HeaderMap,
  type KeyRequestLike,
  type RateLimitHeaderOptions,
  type RequestKeyGenerator,
} from "./middleware/index.js";

export {
  hashRateLimitKey,
  type RateLimiterEvent,
  type RateLimiterEventKind,
  type RateLimiterHooks,
  type SafeRateLimitKey,
} from "./observability/index.js";
