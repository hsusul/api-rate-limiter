# Architecture

The package is built around a small framework-independent core.

```text
Application code or middleware
  -> RateLimiter
  -> Algorithm strategy
  -> Store adapter
```

## Core Components

- `RateLimiter` accepts a store, clock, algorithms, and optional default policy.
- Algorithm strategies evaluate a request and return a `RateLimitResult`.
- Store adapters provide TTL-aware `get`, `set`, `increment`, and `delete` operations.
- `Clock` makes time-dependent behavior deterministic in tests.

## Current Runtime Path

The first functional path is:

```text
RateLimiter.check()
  -> FixedWindowAlgorithm.evaluate()
  -> MemoryStore.increment()
```

This supports single-process in-memory fixed-window limiting. Redis, HTTP middleware, and additional algorithms are intentionally separate layers.
