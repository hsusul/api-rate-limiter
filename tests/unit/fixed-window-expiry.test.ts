import { describe, expect, it } from "vitest";

import {
  FixedWindowAlgorithm,
  ManualClock,
  type Store,
  type StoreIncrementResult,
  type StoreValue,
} from "../../src/index.js";

class RelativeTtlStore implements Store {
  async get() {
    return undefined;
  }

  async set(): Promise<void> {}

  async increment(): Promise<StoreIncrementResult> {
    return {
      value: 1,
      expiresAt: Date.now() + 60_000,
      expiresInMs: 1_000,
    };
  }

  async delete(): Promise<boolean> {
    return false;
  }
}

describe("FixedWindowAlgorithm expiry semantics", () => {
  it("derives resetAt from relative TTL and the algorithm clock", async () => {
    const clock = new ManualClock(10_000);
    const result = await new FixedWindowAlgorithm().evaluate({
      key: "user:123",
      policy: {
        id: "api.default",
        algorithm: "fixed-window",
        limit: 10,
        windowMs: 60_000,
      },
      store: new RelativeTtlStore(),
      clock,
      now: clock.now(),
      cost: 1,
    });

    expect(result.checkedAt).toEqual(new Date(10_000));
    expect(result.resetAt).toEqual(new Date(11_000));
  });
});
