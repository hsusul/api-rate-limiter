import {
  createClient,
  type RedisClientOptions,
  type RedisClientType,
} from "redis";
import type {
  Store,
  StoreEntry,
  StoreIncrementOptions,
  StoreIncrementResult,
  StoreSetOptions,
  StoreValue,
} from "./store.js";

export interface RedisStoreOptions {
  readonly url?: string;
  readonly keyPrefix?: string;
  readonly client?: RedisClientType;
  readonly clientOptions?: RedisClientOptions;
}

const incrementScript = `
local value = redis.call("INCRBY", KEYS[1], ARGV[1])
if value == tonumber(ARGV[1]) and tonumber(ARGV[2]) > 0 then
  redis.call("PEXPIRE", KEYS[1], ARGV[2])
end
local ttl = redis.call("PTTL", KEYS[1])
return { value, ttl }
`;

export class RedisStore implements Store {
  readonly #client: RedisClientType;

  readonly #ownsClient: boolean;

  readonly #keyPrefix: string;

  #connectPromise: Promise<void> | undefined;

  constructor(options: RedisStoreOptions = {}) {
    this.#client =
      options.client ??
      (createClient({
        ...options.clientOptions,
        ...(options.url === undefined ? {} : { url: options.url }),
      }) as RedisClientType);
    this.#ownsClient = options.client === undefined;
    this.#keyPrefix = options.keyPrefix ?? "rl";
  }

  async connect(): Promise<void> {
    await this.#ensureConnected();
  }

  async disconnect(): Promise<void> {
    if (this.#ownsClient && this.#client.isOpen) {
      await this.#client.quit();
    }
  }

  async get<TValue extends StoreValue = StoreValue>(
    key: string,
  ): Promise<StoreEntry<TValue> | undefined> {
    await this.#ensureConnected();

    const redisKey = this.#key(key);
    const [rawValue, ttlMs] = await Promise.all([
      this.#client.get(redisKey),
      this.#client.pTTL(redisKey),
    ]);

    if (rawValue === null || ttlMs === -2) {
      return undefined;
    }

    return {
      value: decodeValue(rawValue) as TValue,
      ...expiresAtFromTtl(ttlMs),
      ...expiresInFromTtl(ttlMs),
    };
  }

  async set<TValue extends StoreValue = StoreValue>(
    key: string,
    value: TValue,
    options: StoreSetOptions = {},
  ): Promise<void> {
    await this.#ensureConnected();

    const redisKey = this.#key(key);
    const encodedValue = encodeValue(value);

    if (options.ttlMs === undefined) {
      await this.#client.set(redisKey, encodedValue);
      return;
    }

    await this.#client.set(redisKey, encodedValue, {
      PX: options.ttlMs,
    });
  }

  async increment(
    key: string,
    options: StoreIncrementOptions = {},
  ): Promise<StoreIncrementResult> {
    await this.#ensureConnected();

    const amount = options.amount ?? 1;
    const ttlMs = options.ttlMs ?? 0;
    const result = (await this.#client.eval(incrementScript, {
      keys: [this.#key(key)],
      arguments: [amount.toString(), ttlMs.toString()],
    })) as [number, number];
    const [value, remainingTtlMs] = result;

    return {
      value,
      ...expiresAtFromTtl(remainingTtlMs),
      ...expiresInFromTtl(remainingTtlMs),
    };
  }

  async delete(key: string): Promise<boolean> {
    await this.#ensureConnected();

    return (await this.#client.del(this.#key(key))) > 0;
  }

  async #ensureConnected(): Promise<void> {
    if (this.#client.isReady) {
      return;
    }

    this.#connectPromise ??= this.#client.connect().then(() => undefined);
    await this.#connectPromise;
  }

  #key(key: string): string {
    return `${this.#keyPrefix}:${key}`;
  }
}

function encodeValue(value: StoreValue): string {
  return JSON.stringify(value);
}

function decodeValue(value: string): StoreValue {
  return JSON.parse(value) as StoreValue;
}

function expiresAtFromTtl(ttlMs: number): Pick<StoreEntry, "expiresAt"> {
  return ttlMs >= 0 ? { expiresAt: Date.now() + ttlMs } : {};
}

function expiresInFromTtl(ttlMs: number): Pick<StoreEntry, "expiresInMs"> {
  return ttlMs >= 0 ? { expiresInMs: ttlMs } : {};
}
