import { createServer, type Server } from "node:http";
import express from "express";
import autocannon from "autocannon";
import {
  ManualClock,
  MemoryStore,
  RateLimiter,
  type RateLimitPolicy,
} from "../src/index.js";
import { expressRateLimit } from "../src/express.js";

interface Scenario {
  readonly name: string;
  readonly policy?: RateLimitPolicy;
  readonly key?: string;
}

const scenarios: readonly Scenario[] = [
  {
    name: "baseline",
  },
  {
    name: "allowed-heavy",
    key: "bench:allowed",
    policy: {
      id: "bench.allowed",
      algorithm: "fixed-window",
      limit: 1_000_000,
      windowMs: 60_000,
    },
  },
  {
    name: "blocked-heavy",
    key: "bench:blocked",
    policy: {
      id: "bench.blocked",
      algorithm: "fixed-window",
      limit: 1,
      windowMs: 60_000,
    },
  },
];

let baselineRequestsPerSecond: number | undefined;

for (const scenario of scenarios) {
  const server = await createBenchmarkServer(scenario);

  try {
    const address = server.address();

    if (address === null || typeof address === "string") {
      throw new Error("HTTP benchmark could not determine the local server port.");
    }

    const result = await runAutocannon(`http://127.0.0.1:${address.port}/limited`);
    const overhead = baselineRequestsPerSecond === undefined
      ? "baseline"
      : `${Math.max(
          0,
          ((baselineRequestsPerSecond - result.requests.average) /
            baselineRequestsPerSecond) *
            100,
        ).toFixed(1)}% overhead`;

    baselineRequestsPerSecond ??= result.requests.average;

    console.log(
      [
        scenario.name.padEnd(14),
        `${result.requests.average.toFixed(0).padStart(8)} req/s`,
        `p50=${result.latency.p50.toFixed(2)}ms`,
        `p99=${result.latency.p99.toFixed(2)}ms`,
        `2xx=${result["2xx"]}`,
        `429=${result.non2xx}`,
        overhead,
      ].join("  "),
    );
  } finally {
    await closeServer(server);
  }
}

async function createBenchmarkServer(scenario: Scenario): Promise<Server> {
  const app = express();

  if (scenario.policy === undefined) {
    app.get("/limited", (_request, response) => {
      response.json({ ok: true });
    });
  } else {
    const clock = new ManualClock(Date.now());
    const limiter = new RateLimiter({
      store: new MemoryStore({ clock }),
      clock,
      defaultPolicy: scenario.policy,
    });

    app.get(
      "/limited",
      expressRateLimit({
        limiter,
        keyGenerator: () => scenario.key ?? "bench",
      }),
      (_request, response) => {
        response.json({ ok: true });
      },
    );
  }

  const server = createServer(app);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  return server;
}

async function runAutocannon(url: string): Promise<autocannon.Result> {
  try {
    return await new Promise<autocannon.Result>((resolve, reject) => {
      autocannon(
        {
          url,
          connections: 10,
          duration: 2,
        },
        (error, result) => {
          if (error !== null) {
            reject(error);
            return;
          }

          resolve(result);
        },
      );
    });
  } catch (error) {
    throw new Error(
      `HTTP benchmark failed. Ensure benchmark dependencies are installed with npm install. Cause: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
