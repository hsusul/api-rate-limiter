# AGENTS.md

## Project

This is a portfolio-quality TypeScript/Node.js backend systems project: a reusable API rate limiter package with pluggable algorithms, in-memory and Redis storage, Express/Fastify middleware, tests, benchmarks, and documentation.

## Core Principles

- Keep the core limiter framework-independent.
- Middleware should adapt HTTP requests into core limiter inputs.
- Prefer small, reviewable commits.
- Do not implement large features without first proposing a plan.
- Add or update tests for every behavior change.
- Prefer deterministic tests using fake timers over real sleeps.
- Do not log raw API keys, tokens, or sensitive request identifiers.
- Document important tradeoffs in README/docs.

## Initial Stack

- Runtime: Node.js
- Language: TypeScript
- Test runner: Vitest
- First middleware target: Express
- Later middleware target: Fastify
- First store: in-memory
- Later production store: Redis

## Target Structure

- src/core
- src/algorithms
- src/stores
- src/middleware
- src/observability
- tests/unit
- tests/integration
- examples
- benchmarks
- docs

## Done Means

- TypeScript builds.
- Tests pass.
- New behavior has tests.
- Public APIs are exported from src/index.ts.
- README or docs are updated when user-facing behavior changes.
- The project remains understandable as a portfolio project.