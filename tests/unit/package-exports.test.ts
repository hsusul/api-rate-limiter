import { describe, expect, it } from "vitest";

import {
  MemoryStore,
  RateLimiter,
  expressRateLimit,
  type Store,
} from "../../src/index.js";
import { RedisStore } from "../../src/redis.js";

describe("public package exports", () => {
  it("exports core, memory, and Express APIs from the root entrypoint", () => {
    expect(RateLimiter).toBeTypeOf("function");
    expect(MemoryStore).toBeTypeOf("function");
    expect(expressRateLimit).toBeTypeOf("function");
  });

  it("exports RedisStore from the Redis adapter entrypoint", () => {
    expect(RedisStore).toBeTypeOf("function");
  });

  it("keeps store types importable from the root entrypoint", () => {
    const store: Store = new MemoryStore();

    expect(store).toBeInstanceOf(MemoryStore);
  });
});
