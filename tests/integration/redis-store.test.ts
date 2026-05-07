import { afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  ManualClock,
  MemoryStore,
  RateLimiter,
  RedisStore,
  type RateLimitPolicy,
} from "../../src/index.js";
import {
  getRedisIntegrationConfig,
  redisIntegrationSkipReason,
  redisUnavailableMessage,
  shouldRunRedisIntegrationTests,
} from "./helpers/redis.js";

const describeRedis = shouldRunRedisIntegrationTests ? describe : describe.skip;

const createdStores: RedisStore[] = [];

afterEach(async () => {
  await Promise.all(createdStores.splice(0).map((store) => store.disconnect()));
});

function createRedisStore(testName: string): RedisStore {
  const store = new RedisStore({
    url: getRedisIntegrationConfig().url,
    keyPrefix: `rl-test:${process.pid}:${testName}:${Date.now()}`,
    clientOptions: {
      socket: {
        connectTimeout: 500,
        reconnectStrategy: false,
      },
    },
  });
  createdStores.push(store);
  return store;
}

function createFixedPolicy(overrides: Partial<RateLimitPolicy> = {}): RateLimitPolicy {
  return {
    id: "api.default",
    algorithm: "fixed-window",
    limit: 2,
    windowMs: 1_000,
    ...overrides,
  };
}

function createSlidingPolicy(
  overrides: Partial<RateLimitPolicy> = {},
): RateLimitPolicy {
  return {
    id: "api.default",
    algorithm: "sliding-window",
    limit: 2,
    windowMs: 1_000,
    ...overrides,
  };
}

describe("Redis store integration scaffold", () => {
  it("defines Redis integration configuration", () => {
    expect(getRedisIntegrationConfig().url).toMatch(/^redis:\/\//);
    expect(redisIntegrationSkipReason).toContain("RUN_REDIS_TESTS=1");
  });
});

describeRedis("RedisStore fixed-window integration", () => {
  beforeAll(async () => {
    const store = createRedisStore("preflight");

    try {
      await store.set("preflight", "ok", { ttlMs: 1_000 });
      await expect(store.get("preflight")).resolves.toMatchObject({
        value: "ok",
      });
    } catch (error) {
      throw new Error(redisUnavailableMessage(error));
    } finally {
      await store.disconnect();
    }
  }, 2_000);

  it("increments counters and sets TTL atomically", async () => {
    const store = createRedisStore("increment");

    const first = await store.increment("counter:user", { ttlMs: 5_000 });
    const second = await store.increment("counter:user", { amount: 2, ttlMs: 5_000 });

    expect(first.value).toBe(1);
    expect(first.expiresAt).toBeGreaterThan(Date.now());
    expect(second.value).toBe(3);
    expect(second.expiresAt).toBeGreaterThan(Date.now());
    expect(second.expiresAt).toBeLessThanOrEqual((first.expiresAt ?? 0) + 50);
  });

  it("supports set, get, TTL, and delete", async () => {
    const store = createRedisStore("contract");

    await store.set("value", { count: 1 }, { ttlMs: 5_000 });
    const entry = await store.get("value");

    expect(entry?.value).toEqual({ count: 1 });
    expect(entry?.expiresAt).toBeGreaterThan(Date.now());
    await expect(store.delete("value")).resolves.toBe(true);
    await expect(store.get("value")).resolves.toBeUndefined();
  });

  it("works with fixed window through RateLimiter", async () => {
    const store = createRedisStore("fixed-window");
    const limiter = new RateLimiter({
      store,
      clock: new ManualClock(1_000),
      defaultPolicy: createFixedPolicy({ limit: 1 }),
    });

    await expect(limiter.check({ key: "user:123" })).resolves.toMatchObject({
      allowed: true,
      remaining: 0,
    });
    await expect(limiter.check({ key: "user:123" })).resolves.toMatchObject({
      allowed: false,
      remaining: 0,
    });
  });

  it("shares fixed window quota across limiter instances", async () => {
    const store = createRedisStore("shared-quota");
    const policy = createFixedPolicy({ limit: 1 });
    const limiterA = new RateLimiter({
      store,
      clock: new ManualClock(1_000),
      defaultPolicy: policy,
    });
    const limiterB = new RateLimiter({
      store,
      clock: new ManualClock(1_000),
      defaultPolicy: policy,
    });

    await expect(limiterA.check({ key: "user:123" })).resolves.toMatchObject({
      allowed: true,
    });
    await expect(limiterB.check({ key: "user:123" })).resolves.toMatchObject({
      allowed: false,
    });
  });

  it("enforces fixed window limits under concurrent requests", async () => {
    const store = createRedisStore("concurrent-fixed");
    const limiter = new RateLimiter({
      store,
      clock: new ManualClock(1_000),
      defaultPolicy: createFixedPolicy({ limit: 5 }),
    });
    const results = await Promise.all(
      Array.from({ length: 20 }, () => limiter.check({ key: "user:123" })),
    );

    expect(results.filter((result) => result.allowed)).toHaveLength(5);
    expect(results.filter((result) => !result.allowed)).toHaveLength(15);
  });
});

describe("RedisStore fixed-window parity without Redis", () => {
  it("documents the same store contract used by in-memory tests", async () => {
    const store = new MemoryStore({ clock: new ManualClock(1_000) });

    await store.increment("counter:user", { ttlMs: 1_000 });

    await expect(store.get("counter:user")).resolves.toMatchObject({
      value: 1,
      expiresAt: 2_000,
    });
  });
});

describeRedis("RedisStore sliding-window integration", () => {
  beforeAll(async () => {
    const store = createRedisStore("sliding-preflight");

    try {
      await store.set("preflight", "ok", { ttlMs: 1_000 });
      await expect(store.get("preflight")).resolves.toMatchObject({
        value: "ok",
      });
    } catch (error) {
      throw new Error(redisUnavailableMessage(error));
    } finally {
      await store.disconnect();
    }
  }, 2_000);

  it("stores current sliding-window buckets with TTL", async () => {
    const store = createRedisStore("sliding-ttl");
    const clock = new ManualClock(1_900);
    const limiter = new RateLimiter({
      store,
      clock,
      defaultPolicy: createSlidingPolicy({ limit: 10 }),
    });

    await limiter.check({ key: "user:123" });

    const bucket = await store.get<number>(
      "sliding-window:api.default:user:123:1000",
    );

    expect(bucket?.value).toBe(1);
    expect(bucket?.expiresAt).toBeGreaterThan(Date.now());
  });

  it("uses previous and current buckets for weighted sliding-window decisions", async () => {
    const store = createRedisStore("sliding-weighted");
    const clock = new ManualClock(1_900);
    const limiter = new RateLimiter({
      store,
      clock,
      defaultPolicy: createSlidingPolicy({ limit: 2 }),
    });

    await limiter.check({ key: "user:123" });
    await limiter.check({ key: "user:123" });

    clock.set(2_100);

    await expect(limiter.check({ key: "user:123" })).resolves.toMatchObject({
      allowed: false,
      algorithm: "sliding-window",
      remaining: 0,
    });
  });

  it("shares sliding-window state across limiter instances", async () => {
    const store = createRedisStore("sliding-shared");
    const policy = createSlidingPolicy({ limit: 1 });
    const limiterA = new RateLimiter({
      store,
      clock: new ManualClock(1_000),
      defaultPolicy: policy,
    });
    const limiterB = new RateLimiter({
      store,
      clock: new ManualClock(1_000),
      defaultPolicy: policy,
    });

    await expect(limiterA.check({ key: "user:123" })).resolves.toMatchObject({
      allowed: true,
    });
    await expect(limiterB.check({ key: "user:123" })).resolves.toMatchObject({
      allowed: false,
    });
  });

  it("enforces sliding-window limits under concurrent requests", async () => {
    const store = createRedisStore("concurrent-sliding");
    const limiter = new RateLimiter({
      store,
      clock: new ManualClock(1_000),
      defaultPolicy: createSlidingPolicy({ limit: 5 }),
    });
    const results = await Promise.all(
      Array.from({ length: 20 }, () => limiter.check({ key: "user:123" })),
    );

    expect(results.filter((result) => result.allowed)).toHaveLength(5);
    expect(results.filter((result) => !result.allowed)).toHaveLength(15);
  });
});
