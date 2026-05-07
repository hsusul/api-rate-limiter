import { describe, expect, expectTypeOf, it } from "vitest";

import { ManualClock, type Store, type StoreEntry } from "../../src/index.js";
import type {
  StoreIncrementOptions,
  StoreIncrementResult,
  StoreSetOptions,
  StoreValue,
} from "../../src/stores/index.js";

class TestStore implements Store {
  readonly #clock: ManualClock;

  readonly #entries = new Map<string, StoreEntry>();

  constructor(clock: ManualClock) {
    this.#clock = clock;
  }

  async get<TValue extends StoreValue = StoreValue>(
    key: string,
  ): Promise<StoreEntry<TValue> | undefined> {
    const entry = this.#entries.get(key);

    if (entry === undefined) {
      return undefined;
    }

    if (entry.expiresAt !== undefined && entry.expiresAt <= this.#clock.now()) {
      this.#entries.delete(key);
      return undefined;
    }

    return entry as StoreEntry<TValue>;
  }

  async set<TValue extends StoreValue = StoreValue>(
    key: string,
    value: TValue,
    options: StoreSetOptions = {},
  ): Promise<void> {
    this.#entries.set(key, {
      value,
      ...(options.ttlMs === undefined
        ? {}
        : { expiresAt: this.#clock.now() + options.ttlMs }),
    });
  }

  async increment(
    key: string,
    options: StoreIncrementOptions = {},
  ): Promise<StoreIncrementResult> {
    const amount = options.amount ?? 1;
    const existing = await this.get<number>(key);
    const nextValue = (existing?.value ?? 0) + amount;
    const expiresAt =
      existing?.expiresAt ??
      (options.ttlMs === undefined ? undefined : this.#clock.now() + options.ttlMs);

    this.#entries.set(key, {
      value: nextValue,
      ...(expiresAt === undefined ? {} : { expiresAt }),
    });

    return {
      value: nextValue,
      ...(expiresAt === undefined ? {} : { expiresAt }),
      ...(expiresAt === undefined
        ? {}
        : { expiresInMs: Math.max(0, expiresAt - this.#clock.now()) }),
    };
  }

  async delete(key: string): Promise<boolean> {
    return this.#entries.delete(key);
  }
}

describe("store contract", () => {
  it("exports framework-independent store types", () => {
    expectTypeOf<Store>().toMatchTypeOf<{
      get<TValue extends StoreValue = StoreValue>(
        key: string,
      ): Promise<StoreEntry<TValue> | undefined>;
      set<TValue extends StoreValue = StoreValue>(
        key: string,
        value: TValue,
        options?: StoreSetOptions,
      ): Promise<void>;
      increment(
        key: string,
        options?: StoreIncrementOptions,
      ): Promise<StoreIncrementResult>;
      delete(key: string): Promise<boolean>;
    }>();
  });

  it("can represent TTL-based values", async () => {
    const clock = new ManualClock(1_000);
    const store = new TestStore(clock);

    await store.set("policy:user", 42, { ttlMs: 500 });

    await expect(store.get<number>("policy:user")).resolves.toEqual({
      value: 42,
      expiresAt: 1_500,
    });

    clock.advance(500);

    await expect(store.get("policy:user")).resolves.toBeUndefined();
  });

  it("can represent TTL-based counters", async () => {
    const clock = new ManualClock(10_000);
    const store = new TestStore(clock);

    await expect(
      store.increment("counter:user", { ttlMs: 1_000 }),
    ).resolves.toEqual({
      value: 1,
      expiresInMs: 1_000,
      expiresAt: 11_000,
    });

    await expect(
      store.increment("counter:user", { amount: 4, ttlMs: 1_000 }),
    ).resolves.toEqual({
      value: 5,
      expiresInMs: 1_000,
      expiresAt: 11_000,
    });

    clock.advance(1_000);

    await expect(store.get("counter:user")).resolves.toBeUndefined();
  });

  it("can delete keys", async () => {
    const store = new TestStore(new ManualClock());

    await store.set("key", "value");

    await expect(store.delete("key")).resolves.toBe(true);
    await expect(store.delete("key")).resolves.toBe(false);
    await expect(store.get("key")).resolves.toBeUndefined();
  });
});
