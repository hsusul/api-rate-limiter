import { performance } from "node:perf_hooks";
import {
  ManualClock,
  MemoryStore,
  RateLimiter,
  type RateLimitAlgorithm,
  type RateLimitPolicy,
} from "../src/index.js";

interface Scenario {
  readonly name: string;
  readonly algorithm: RateLimitAlgorithm;
  readonly keyFor: (index: number) => string;
}

const iterations = 50_000;

const scenarios: readonly Scenario[] = [
  {
    name: "fixed-window hot key",
    algorithm: "fixed-window",
    keyFor: () => "user:hot",
  },
  {
    name: "fixed-window many keys",
    algorithm: "fixed-window",
    keyFor: (index) => `user:${index}`,
  },
  {
    name: "sliding-window hot key",
    algorithm: "sliding-window",
    keyFor: () => "user:hot",
  },
  {
    name: "sliding-window many keys",
    algorithm: "sliding-window",
    keyFor: (index) => `user:${index}`,
  },
];

for (const scenario of scenarios) {
  const result = await runScenario(scenario);

  console.log(
    [
      result.name.padEnd(28),
      `${result.iterations.toString().padStart(7)} checks`,
      `${result.checksPerSecond.toFixed(0).padStart(9)} checks/s`,
      `${result.durationMs.toFixed(2).padStart(8)} ms`,
      `allowed=${result.allowed}`,
      `blocked=${result.blocked}`,
    ].join("  "),
  );
}

async function runScenario(scenario: Scenario) {
  const clock = new ManualClock(1_000);
  const policy: RateLimitPolicy = {
    id: `bench.${scenario.algorithm}`,
    algorithm: scenario.algorithm,
    limit: 1_000_000,
    windowMs: 60_000,
  };
  const limiter = new RateLimiter({
    store: new MemoryStore({ clock }),
    clock,
    defaultPolicy: policy,
  });
  let allowed = 0;
  let blocked = 0;
  const startedAt = performance.now();

  for (let index = 0; index < iterations; index += 1) {
    const result = await limiter.check({
      key: scenario.keyFor(index),
    });

    if (result.allowed) {
      allowed += 1;
    } else {
      blocked += 1;
    }
  }

  const durationMs = performance.now() - startedAt;

  return {
    name: scenario.name,
    iterations,
    durationMs,
    checksPerSecond: iterations / (durationMs / 1_000),
    allowed,
    blocked,
  };
}
