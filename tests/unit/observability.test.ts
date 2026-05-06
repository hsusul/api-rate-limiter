import { describe, expect, it } from "vitest";

import {
  hashRateLimitKey,
  ManualClock,
  MemoryStore,
  RateLimiter,
  type RateLimiterEvent,
} from "../../src/index.js";

describe("RateLimiter observability hooks", () => {
  it("emits onAllow events with safe key metadata", async () => {
    const events: RateLimiterEvent[] = [];
    const clock = new ManualClock(1_000);
    const limiter = new RateLimiter({
      store: new MemoryStore({ clock }),
      clock,
      defaultPolicy: {
        id: "api.default",
        algorithm: "fixed-window",
        limit: 2,
        windowMs: 1_000,
      },
      hooks: {
        onAllow: (event) => events.push(event),
      },
    });

    await limiter.check({ key: "secret-api-key" });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "allow",
      policyId: "api.default",
      algorithm: "fixed-window",
      key: {
        hash: hashRateLimitKey("secret-api-key"),
      },
      latencyMs: 0,
    });
    expect(events[0]?.key).not.toHaveProperty("value");
    expect(events[0]?.result.allowed).toBe(true);
  });

  it("emits onBlock events", async () => {
    const events: RateLimiterEvent[] = [];
    const clock = new ManualClock(1_000);
    const limiter = new RateLimiter({
      store: new MemoryStore({ clock }),
      clock,
      defaultPolicy: {
        id: "api.default",
        algorithm: "fixed-window",
        limit: 1,
        windowMs: 1_000,
      },
      hooks: {
        onBlock: (event) => events.push(event),
      },
    });

    await limiter.check({ key: "user:123" });
    await limiter.check({ key: "user:123" });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "block",
      policyId: "api.default",
      algorithm: "fixed-window",
    });
    expect(events[0]?.result.allowed).toBe(false);
  });

  it("emits onError events for fail-open results", async () => {
    const events: RateLimiterEvent[] = [];
    const clock = new ManualClock(1_000);
    const limiter = new RateLimiter({
      store: new MemoryStore({ clock }),
      clock,
      algorithms: [
        {
          name: "fixed-window",
          async evaluate() {
            throw new Error("backend down");
          },
        },
      ],
      defaultPolicy: {
        id: "api.default",
        algorithm: "fixed-window",
        limit: 1,
        windowMs: 1_000,
      },
      hooks: {
        onError: (event) => events.push(event),
      },
    });

    await expect(limiter.check({ key: "user:123" })).resolves.toMatchObject({
      allowed: true,
      failure: {
        behavior: "fail-open",
      },
    });
    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe("error");
    expect(events[0]?.result.failure?.message).toBe("backend down");
  });

  it("does not let hook failures break rate limiting by default", async () => {
    const limiter = new RateLimiter({
      store: new MemoryStore({ clock: new ManualClock() }),
      defaultPolicy: {
        id: "api.default",
        algorithm: "fixed-window",
        limit: 1,
        windowMs: 1_000,
      },
      hooks: {
        onAllow: () => {
          throw new Error("hook failed");
        },
      },
    });

    await expect(limiter.check({ key: "user:123" })).resolves.toMatchObject({
      allowed: true,
    });
  });

  it("can be configured to throw hook failures", async () => {
    const limiter = new RateLimiter({
      store: new MemoryStore({ clock: new ManualClock() }),
      defaultPolicy: {
        id: "api.default",
        algorithm: "fixed-window",
        limit: 1,
        windowMs: 1_000,
      },
      hooks: {
        throwOnHookError: true,
        onAllow: () => {
          throw new Error("hook failed");
        },
      },
    });

    await expect(limiter.check({ key: "user:123" })).rejects.toThrow(
      "hook failed",
    );
  });
});
