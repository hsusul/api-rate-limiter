import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { ManualClock, MemoryStore, RateLimiter, type RateLimitPolicy } from "../../src/index.js";
import { expressRateLimit } from "../../src/express.js";

function createPolicy(overrides: Partial<RateLimitPolicy> = {}): RateLimitPolicy {
  return {
    id: "api.default",
    algorithm: "fixed-window",
    limit: 2,
    windowMs: 1_000,
    ...overrides,
  };
}

function createApp(options: {
  clock?: ManualClock;
  policy?: RateLimitPolicy;
  keyGenerator?: Parameters<typeof expressRateLimit>[0]["keyGenerator"];
  skip?: Parameters<typeof expressRateLimit>[0]["skip"];
  cost?: Parameters<typeof expressRateLimit>[0]["cost"];
  headers?: boolean;
  legacyHeaders?: boolean;
} = {}) {
  const clock = options.clock ?? new ManualClock(1_000);
  const limiter = new RateLimiter({
    store: new MemoryStore({ clock }),
    clock,
    defaultPolicy: options.policy ?? createPolicy(),
  });
  const app = express();

  app.get(
    "/limited",
    expressRateLimit({
      limiter,
      keyGenerator: options.keyGenerator,
      skip: options.skip,
      cost: options.cost,
      headers: options.headers,
      legacyHeaders: options.legacyHeaders,
    }),
    (_request, response) => {
      response.json({ ok: true });
    },
  );

  return { app, clock };
}

describe("expressRateLimit", () => {
  it("allows requests under the limit and sets headers", async () => {
    const { app } = createApp();

    const response = await request(app).get("/limited").expect(200);

    expect(response.body).toEqual({ ok: true });
    expect(response.headers["ratelimit-limit"]).toBe("2");
    expect(response.headers["ratelimit-remaining"]).toBe("1");
    expect(response.headers["ratelimit-reset"]).toBe("2");
  });

  it("returns 429 when the limit is exceeded", async () => {
    const { app } = createApp({ policy: createPolicy({ limit: 1 }) });

    await request(app).get("/limited").expect(200);
    const response = await request(app).get("/limited").expect(429);

    expect(response.body).toEqual({
      error: "rate_limit_exceeded",
      message: "Too many requests",
      retryAfterMs: 1_000,
    });
    expect(response.headers["retry-after"]).toBe("1");
    expect(response.headers["ratelimit-remaining"]).toBe("0");
  });

  it("supports custom key generation", async () => {
    const { app } = createApp({
      policy: createPolicy({ limit: 1 }),
      keyGenerator: (req) => req.header("x-api-key") ?? "missing",
    });

    await request(app).get("/limited").set("x-api-key", "a").expect(200);
    await request(app).get("/limited").set("x-api-key", "a").expect(429);
    await request(app).get("/limited").set("x-api-key", "b").expect(200);
  });

  it("can skip requests", async () => {
    const { app } = createApp({
      policy: createPolicy({ limit: 1 }),
      skip: (req) => req.header("x-skip") === "true",
    });

    await request(app).get("/limited").set("x-skip", "true").expect(200);
    await request(app).get("/limited").set("x-skip", "true").expect(200);
  });

  it("supports request cost", async () => {
    const { app } = createApp({
      policy: createPolicy({ limit: 3 }),
      cost: () => 2,
    });

    await request(app).get("/limited").expect(200);
    const response = await request(app).get("/limited").expect(429);

    expect(response.body.retryAfterMs).toBe(1_000);
  });

  it("can disable headers", async () => {
    const { app } = createApp({ headers: false });

    const response = await request(app).get("/limited").expect(200);

    expect(response.headers["ratelimit-limit"]).toBeUndefined();
  });

  it("can emit legacy headers", async () => {
    const { app } = createApp({ legacyHeaders: true });

    const response = await request(app).get("/limited").expect(200);

    expect(response.headers["x-ratelimit-limit"]).toBe("2");
    expect(response.headers["x-ratelimit-remaining"]).toBe("1");
  });
});
