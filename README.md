# API Rate Limiter

A production-style TypeScript/Node.js API rate limiter with pluggable algorithms, storage adapters, Express middleware, Redis-backed distributed mode, tests, and benchmarks.

The core limiter is framework-independent. HTTP middleware and storage adapters sit on top of the same `RateLimiter` API.

## Features

- Framework-independent `RateLimiter` core
- Fixed-window and sliding-window counter algorithms
- In-memory store for local and single-process usage
- Redis store for distributed multi-instance usage
- Express middleware
- Standard and legacy rate limit headers
- Configurable fail-open or fail-closed behavior
- Lightweight observability hooks
- Deterministic tests with manual clocks
- Core and HTTP benchmark scripts

## Quick Start

```ts
import { MemoryStore, RateLimiter } from "api-rate-limiter";

const limiter = new RateLimiter({
  store: new MemoryStore(),
  defaultPolicy: {
    id: "api.default",
    algorithm: "sliding-window",
    limit: 100,
    windowMs: 60_000,
  },
});

const result = await limiter.check({ key: "user:123" });

if (!result.allowed) {
  console.log(`Retry after ${result.retryAfterMs}ms`);
}
```

## Express Usage

```ts
import express from "express";
import { MemoryStore, RateLimiter } from "api-rate-limiter";
import { expressRateLimit } from "api-rate-limiter/express";

const app = express();

const limiter = new RateLimiter({
  store: new MemoryStore(),
  defaultPolicy: {
    id: "api.default",
    algorithm: "fixed-window",
    limit: 50,
    windowMs: 60_000,
  },
});

app.get(
  "/api/widgets",
  expressRateLimit({
    limiter,
    keyGenerator: (request) => request.ip ?? "unknown",
  }),
  (_request, response) => {
    response.json({ ok: true });
  },
);
```

## Redis Usage

Redis is exposed through a separate adapter entrypoint so in-memory users do not need Redis at runtime.

```ts
import { RateLimiter } from "api-rate-limiter";
import { RedisStore } from "api-rate-limiter/redis";

const store = new RedisStore({
  url: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
});

await store.connect();

const limiter = new RateLimiter({
  store,
  defaultPolicy: {
    id: "api.default",
    algorithm: "sliding-window",
    limit: 100,
    windowMs: 60_000,
  },
});
```

Use Redis when multiple Node.js processes, containers, or instances must share quota state. The in-memory store is suitable for local development and single-process services.

## Algorithms

| Algorithm | Accuracy | Burst Handling | Storage Cost | Status |
| --- | --- | --- | --- | --- |
| Fixed window | Medium | Weak near boundaries | Low | Supported |
| Sliding window counter | Good | Good | Low | Supported |
| Token bucket | Good | Excellent | Medium | Planned |
| Leaky bucket | Good | Smooths traffic | Medium | Planned |
| Sliding log | Excellent | Excellent | High | Planned |

See [docs/algorithms.md](docs/algorithms.md) for algorithm notes and tradeoffs.

## Failure Behavior

`RateLimiter` defaults to `fail-open`: if storage or algorithm evaluation fails, the request is allowed and the returned result includes `failure` metadata.

Use `failureBehavior: "fail-closed"` to block requests during limiter failures:

```ts
const limiter = new RateLimiter({
  store,
  failureBehavior: "fail-closed",
  defaultPolicy,
});
```

## Observability

`RateLimiter` supports lightweight hooks:

```ts
const limiter = new RateLimiter({
  store,
  defaultPolicy,
  hooks: {
    onAllow: (event) => console.log(event.policyId, event.latencyMs),
    onBlock: (event) => console.log(event.result.retryAfterMs),
    onError: (event) => console.error(event.result.failure),
  },
});
```

Events include policy ID, algorithm, result, latency, and a hashed key. Raw request keys are not exposed by default.

## Benchmarks

Core in-memory benchmark:

```sh
npm run bench
```

HTTP middleware benchmark:

```sh
npm run bench:http
```

See [benchmarks/README.md](benchmarks/README.md) for scenarios and caveats.

## Development

```sh
npm install
npm test
npm run build
npm run typecheck
```

Redis integration tests are opt-in:

```sh
docker compose up -d redis
RUN_REDIS_TESTS=1 npm test -- tests/integration/redis-store.test.ts
```

## Examples

- `examples/express-basic`: Express route protected by the in-memory fixed-window limiter.
- `examples/express-redis`: Express route protected by Redis-backed distributed limiting.

## Documentation

- [Redis design](docs/redis-design.md)
- [Production notes](docs/production-notes.md)
- [Algorithm notes](docs/algorithms.md)

## Limitations

- Fastify middleware is not implemented yet.
- Redis sliding-window decisions use a generic store flow with atomic current-bucket increments, not a single multi-key Lua decision.
- Multi-region strongly consistent limiting is out of scope.
- This package is not a WAF, bot detector, authentication system, or billing system.

## Roadmap

- Fastify middleware
- Token bucket algorithm
- Prometheus metrics adapter
- HTTP benchmark result snapshots
- Redis-specific Lua optimization for sliding-window decisions
