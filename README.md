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

Commit 1 initializes the TypeScript library skeleton only. No rate limiting behavior has been implemented yet.

## Development

```sh
npm install
npm test
npm run build
npm run typecheck
```
