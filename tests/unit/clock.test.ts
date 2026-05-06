import { describe, expect, expectTypeOf, it } from "vitest";

import {
  type Clock,
  ManualClock,
  SystemClock,
  systemClock,
} from "../../src/index.js";

describe("clock abstraction", () => {
  it("defines a framework-independent clock contract", () => {
    expectTypeOf<Clock>().toMatchTypeOf<{
      now(): number;
      nowDate(): Date;
    }>();
  });

  it("reads real runtime time from the system clock", () => {
    const clock = new SystemClock();
    const before = Date.now();
    const current = clock.now();
    const after = Date.now();

    expect(current).toBeGreaterThanOrEqual(before);
    expect(current).toBeLessThanOrEqual(after);
    expect(clock.nowDate()).toBeInstanceOf(Date);
  });

  it("exports a shared system clock instance", () => {
    expect(systemClock).toBeInstanceOf(SystemClock);
    expect(systemClock.nowDate().getTime()).toBeGreaterThan(0);
  });

  it("can initialize a manual clock from a timestamp", () => {
    const clock = new ManualClock(1_000);

    expect(clock.now()).toBe(1_000);
    expect(clock.nowDate()).toEqual(new Date(1_000));
  });

  it("can initialize a manual clock from a Date", () => {
    const initialTime = new Date("2026-05-06T12:00:00.000Z");
    const clock = new ManualClock(initialTime);

    expect(clock.now()).toBe(initialTime.getTime());
    expect(clock.nowDate()).toEqual(initialTime);
  });

  it("can advance manual time without sleeping", () => {
    const clock = new ManualClock(1_000);

    clock.advance(250);
    clock.advance(750);

    expect(clock.now()).toBe(2_000);
    expect(clock.nowDate()).toEqual(new Date(2_000));
  });

  it("can set manual time directly", () => {
    const clock = new ManualClock(1_000);
    const nextTime = new Date("2026-05-06T12:01:00.000Z");

    clock.set(nextTime);

    expect(clock.now()).toBe(nextTime.getTime());

    clock.set(3_000);

    expect(clock.now()).toBe(3_000);
  });
});
