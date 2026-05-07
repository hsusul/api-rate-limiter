# Production Notes

## Store Choice

Use `MemoryStore` for local development, tests, and single-process services. It does not share quota state across processes.

Use `RedisStore` when multiple Node.js processes, containers, or instances need to enforce the same quota.

## Redis Availability

Redis failures are handled by the core `RateLimiter` failure behavior:

- `fail-open` allows traffic and attaches failure metadata.
- `fail-closed` blocks traffic and attaches failure metadata.

The default is `fail-open` to preserve API availability. Security-sensitive routes may prefer `fail-closed`.

## Privacy

Do not use raw API keys, bearer tokens, session IDs, or other secrets as rate limit keys. Prefer stable internal identifiers such as user IDs, tenant IDs, or hashes.

Observability events expose hashed keys by default and do not include raw request keys.

## Key Cardinality

High-cardinality keys increase memory usage in both in-memory and Redis stores. Common high-cardinality sources include raw IPs, raw tokens, and per-request identifiers.

Use bounded key strategies where possible:

- user ID
- tenant ID
- API client ID
- route group plus user ID

## Concurrency

`RedisStore.increment()` uses Lua to make counter increment plus first-write TTL atomic. This is required for fixed-window correctness under concurrent requests.

The sliding-window implementation uses an atomic current-bucket increment and a separate previous-bucket read through the generic store interface. This is acceptable for the current approximate counter design, but a stricter implementation could move the full previous/current bucket decision into a Redis-specific Lua script.

## Multi-Region Caveats

This package does not provide strongly consistent multi-region rate limiting. If Redis is deployed per region, limits are effectively regional. A single global Redis instance increases latency and creates a dependency on cross-region connectivity.

For global APIs, document whether quotas are regional or global before relying on them for abuse prevention or billing enforcement.

## Failure Modes

Expected failure modes include:

- Redis unavailable
- Redis timeout
- Redis script error
- high key cardinality causing memory pressure
- clock skew across app instances
- policy misconfiguration

Policy and configuration errors are surfaced as exceptions. Store and algorithm failures can be translated into fail-open or fail-closed results.

## Headers

Express middleware emits standard `RateLimit-*` headers by default and can also emit legacy `X-RateLimit-*` headers.

## What This Is Not

This package is not a WAF, bot detector, authentication system, billing engine, queue, or API gateway. It is a reusable limiter core with middleware and storage adapters.
