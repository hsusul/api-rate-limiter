import { systemClock, type Clock } from "../core/clock.js";
import type {
  Store,
  StoreEntry,
  StoreIncrementOptions,
  StoreIncrementResult,
  StoreSetOptions,
  StoreValue,
} from "./store.js";

export interface MemoryStoreOptions {
  readonly clock?: Clock;
}

export class MemoryStore implements Store {
  readonly #clock: Clock;

  readonly #entries = new Map<string, StoreEntry>();

  constructor(options: MemoryStoreOptions = {}) {
    this.#clock = options.clock ?? systemClock;
  }

  async get<TValue extends StoreValue = StoreValue>(
    key: string,
  ): Promise<StoreEntry<TValue> | undefined> {
    const entry = this.#getActiveEntry(key);

    if (entry === undefined) {
      return undefined;
    }

    return entry as StoreEntry<TValue>;
  }

  async set<TValue extends StoreValue = StoreValue>(
    key: string,
    value: TValue,
    options: StoreSetOptions = {},
  ): Promise<void> {
    this.#deleteIfExpired(key);

    this.#entries.set(key, {
      value,
      ...this.#expiryFromTtl(options.ttlMs),
    });
  }

  async increment(
    key: string,
    options: StoreIncrementOptions = {},
  ): Promise<StoreIncrementResult> {
    const existing = this.#getActiveEntry<number>(key);
    const value = (existing?.value ?? 0) + (options.amount ?? 1);
    const expiry =
      existing?.expiresAt === undefined
        ? this.#expiryFromTtl(options.ttlMs)
        : { expiresAt: existing.expiresAt };

    this.#entries.set(key, {
      value,
      ...expiry,
    });

    return {
      value,
      ...expiry,
    };
  }

  async delete(key: string): Promise<boolean> {
    this.#deleteIfExpired(key);
    return this.#entries.delete(key);
  }

  #getActiveEntry<TValue extends StoreValue = StoreValue>(
    key: string,
  ): StoreEntry<TValue> | undefined {
    const entry = this.#entries.get(key);

    if (entry === undefined) {
      return undefined;
    }

    if (this.#isExpired(entry)) {
      this.#entries.delete(key);
      return undefined;
    }

    return entry as StoreEntry<TValue>;
  }

  #deleteIfExpired(key: string): void {
    const entry = this.#entries.get(key);

    if (entry !== undefined && this.#isExpired(entry)) {
      this.#entries.delete(key);
    }
  }

  #isExpired(entry: StoreEntry): boolean {
    return entry.expiresAt !== undefined && entry.expiresAt <= this.#clock.now();
  }

  #expiryFromTtl(ttlMs: number | undefined): Pick<StoreEntry, "expiresAt"> {
    return ttlMs === undefined ? {} : { expiresAt: this.#clock.now() + ttlMs };
  }
}
