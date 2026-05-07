import { describe, expect, expectTypeOf, it } from "vitest";

import {
  ManualClock,
  MemoryStore,
  type MemoryStoreOptions,
  type Store,
} from "../../src/index.js";

describe("MemoryStore", () => {
  it("implements the Store interface", () => {
    expectTypeOf<MemoryStore>().toMatchTypeOf<Store>();
    expectTypeOf<MemoryStoreOptions>().toMatchTypeOf<{
      readonly clock?: ManualClock;
    }>();
  });

  it("returns undefined for missing keys", async () => {
    const store = new MemoryStore({ clock: new ManualClock() });

    await expect(store.get("missing")).resolves.toBeUndefined();
  });

  it("stores values with set", async () => {
    const store = new MemoryStore({ clock: new ManualClock(1_000) });

    await store.set("policy:user", { count: 1 });

    await expect(store.get("policy:user")).resolves.toEqual({
      value: { count: 1 },
    });
  });

  it("expires values set with TTL", async () => {
    const clock = new ManualClock(1_000);
    const store = new MemoryStore({ clock });

    await store.set("policy:user", "value", { ttlMs: 500 });

    await expect(store.get("policy:user")).resolves.toEqual({
      value: "value",
      expiresInMs: 500,
      expiresAt: 1_500,
    });

    clock.advance(499);

    await expect(store.get("policy:user")).resolves.toEqual({
      value: "value",
      expiresInMs: 1,
      expiresAt: 1_500,
    });

    clock.advance(1);

    await expect(store.get("policy:user")).resolves.toBeUndefined();
  });

  it("ignores expired entries before overwriting them", async () => {
    const clock = new ManualClock(1_000);
    const store = new MemoryStore({ clock });

    await store.set("key", "old", { ttlMs: 100 });
    clock.advance(100);
    await store.set("key", "new");

    await expect(store.get("key")).resolves.toEqual({ value: "new" });
  });

  it("initializes missing counters with increment", async () => {
    const store = new MemoryStore({ clock: new ManualClock(1_000) });

    await expect(store.increment("counter:user")).resolves.toEqual({
      value: 1,
    });
    await expect(store.get<number>("counter:user")).resolves.toEqual({
      value: 1,
    });
  });

  it("increments existing counters", async () => {
    const store = new MemoryStore({ clock: new ManualClock(1_000) });

    await store.increment("counter:user");
    await expect(
      store.increment("counter:user", { amount: 4 }),
    ).resolves.toEqual({
      value: 5,
    });
  });

  it("respects counter TTL and preserves the original expiry", async () => {
    const clock = new ManualClock(10_000);
    const store = new MemoryStore({ clock });

    await expect(
      store.increment("counter:user", { ttlMs: 1_000 }),
    ).resolves.toEqual({
      value: 1,
      expiresInMs: 1_000,
      expiresAt: 11_000,
    });

    clock.advance(500);

    await expect(
      store.increment("counter:user", { amount: 2, ttlMs: 2_000 }),
    ).resolves.toEqual({
      value: 3,
      expiresInMs: 500,
      expiresAt: 11_000,
    });

    clock.advance(500);

    await expect(store.get("counter:user")).resolves.toBeUndefined();
  });

  it("starts a fresh counter after expiry", async () => {
    const clock = new ManualClock(10_000);
    const store = new MemoryStore({ clock });

    await store.increment("counter:user", { ttlMs: 1_000 });
    clock.advance(1_000);

    await expect(
      store.increment("counter:user", { amount: 3, ttlMs: 2_000 }),
    ).resolves.toEqual({
      value: 3,
      expiresInMs: 2_000,
      expiresAt: 13_000,
    });
  });

  it("deletes keys", async () => {
    const store = new MemoryStore({ clock: new ManualClock() });

    await store.set("key", "value");

    await expect(store.delete("key")).resolves.toBe(true);
    await expect(store.get("key")).resolves.toBeUndefined();
    await expect(store.delete("key")).resolves.toBe(false);
  });

  it("treats deleting an expired key as deleting a missing key", async () => {
    const clock = new ManualClock(1_000);
    const store = new MemoryStore({ clock });

    await store.set("key", "value", { ttlMs: 100 });
    clock.advance(100);

    await expect(store.delete("key")).resolves.toBe(false);
  });

  it("keeps keys isolated", async () => {
    const store = new MemoryStore({ clock: new ManualClock(1_000) });

    await store.set("key:a", "a");
    await store.increment("key:b", { amount: 2 });

    await expect(store.get("key:a")).resolves.toEqual({ value: "a" });
    await expect(store.get<number>("key:b")).resolves.toEqual({ value: 2 });
    await expect(store.get("key:c")).resolves.toBeUndefined();
  });
});
