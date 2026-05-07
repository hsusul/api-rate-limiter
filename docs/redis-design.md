# Redis Store Design

Redis will provide the distributed storage backend for multi-process and multi-instance deployments. The core limiter and algorithms should continue to depend only on the generic `Store` interface.

## Key Naming

Redis keys should be namespaced and algorithm-specific:

```text
rl:{algorithm}:{policyId}:{subjectKey}
rl:{algorithm}:{policyId}:{subjectKey}:{windowStartMs}
```

Expected examples:

```text
rl:fixed-window:api.default:user_123
rl:sliding-window:api.default:user_123:180000
```

The application should avoid putting raw secrets such as API keys directly in Redis keys. Middleware or callers should pass a stable safe identifier, such as a user ID, tenant ID, or hash.

## TTL Behavior

Redis keys must expire automatically.

- Fixed window counters use a TTL of `windowMs`.
- Sliding window counters use a TTL of at least `windowMs * 2` so the previous bucket remains available while calculating the weighted count.
- TTL should be set when a counter is first created.
- Existing counter TTL should not be extended on every increment unless a specific algorithm requires that behavior.

This matches the in-memory store behavior where counter expiry is established on first increment.

## Atomicity Requirements

Distributed rate limiting requires atomic read/write behavior.

Fixed window needs:

- increment the counter
- set expiry only when the key is first created
- return the incremented value and expiry/reset metadata

Sliding window needs:

- read the previous window counter
- increment the current window counter
- preserve or initialize current window TTL
- return enough data to calculate the result consistently

For Redis, these operations should use Lua scripts or equivalent atomic command flows. Plain `GET` plus `INCR` plus `EXPIRE` sequences can race under concurrency.

## Fixed Window Storage Approach

Fixed window can use one counter key per policy/subject/window lifecycle:

```text
rl:fixed-window:{policyId}:{subjectKey}
```

On request:

1. Increment by request cost.
2. If the key was newly created, set `PEXPIRE` to `windowMs`.
3. Return the current count and remaining TTL.

The algorithm uses the returned count to decide allow/block and the remaining TTL to calculate `resetAt` and `retryAfterMs`.

## Sliding Window Storage Approach

Sliding window can use bucketed counter keys:

```text
rl:sliding-window:{policyId}:{subjectKey}:{windowStartMs}
```

On request:

1. Compute `currentWindowStartMs`.
2. Compute `previousWindowStartMs`.
3. Read previous bucket count.
4. Increment current bucket by request cost.
5. Set current bucket TTL to `windowMs * 2` if newly created.
6. Return previous count, current count, and current bucket TTL/reset information.

The algorithm calculates:

```text
estimated = currentCount + previousCount * previousWindowWeight
```

## Failure Behavior

The core `RateLimiter` already supports configurable failure behavior:

- `fail-open`: allow the request and attach failure metadata.
- `fail-closed`: block the request and attach failure metadata.

Redis connection errors, timeouts, and script errors should be surfaced as store/algorithm failures and handled by the core limiter. Redis-specific code should not decide allow/block policy directly.

## Local Testing Instructions

Start Redis:

```sh
docker compose up -d redis
```

Run tests:

```sh
npm test
```

Future Redis integration tests should read `REDIS_URL`, defaulting to:

```text
redis://127.0.0.1:6379
```

Stop Redis:

```sh
docker compose down
```
