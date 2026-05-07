import { describe, expect, it } from "vitest";

import {
  MemoryStore,
  RateLimiter,
  type Store,
} from "../../src/index.js";
import { expressRateLimit } from "../../src/express.js";
import { RedisStore } from "../../src/redis.js";

describe("public package exports", () => {
  it("exports core and memory APIs from the root entrypoint", () => {
    expect(RateLimiter).toBeTypeOf("function");
    expect(MemoryStore).toBeTypeOf("function");
  });

  it("exports Express middleware from the Express adapter entrypoint", () => {
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
