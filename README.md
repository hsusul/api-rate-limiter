# API Rate Limiter

A portfolio-quality TypeScript/Node.js library for API rate limiting.

This project is being built as a reusable package first. The core limiter will remain framework-independent, with middleware adapters layered on top for HTTP frameworks.

## Planned Scope

- Framework-independent core rate limiter
- Pluggable rate limiting algorithms
- In-memory storage adapter first
- Redis storage adapter for distributed mode later
- Express middleware first
- Fastify middleware later
- Vitest test suite
- Benchmarks and production notes

## Project Structure

```text
src/
  core/
  algorithms/
  stores/
  middleware/
  observability/
tests/
  unit/
  integration/
docs/
examples/
benchmarks/
```

## Current Status

The current checkpoint provides a framework-independent in-memory fixed-window limiter through the core `RateLimiter` API.

## Quick Start

```ts
import { MemoryStore, RateLimiter } from "api-rate-limiter";

const limiter = new RateLimiter({
  store: new MemoryStore(),
  defaultPolicy: {
    id: "api.default",
    algorithm: "fixed-window",
    limit: 100,
    windowMs: 60_000,
  },
});

const result = await limiter.check({ key: "user:123" });

if (!result.allowed) {
  console.log(`Retry after ${result.retryAfterMs}ms`);
}
```

The core package does not depend on Express, Fastify, Redis, or HTTP request types. Middleware and distributed storage adapters are layered on top of the same core API.

## Development

```sh
npm install
npm test
npm run build
npm run typecheck
```
