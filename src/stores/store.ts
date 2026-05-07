export type StoreValue =
  | string
  | number
  | boolean
  | null
  | readonly StoreValue[]
  | { readonly [key: string]: StoreValue };

export interface StoreSetOptions {
  readonly ttlMs?: number;
}

export interface StoreIncrementOptions {
  readonly amount?: number;
  readonly ttlMs?: number;
}

export interface StoreIncrementResult {
  readonly value: number;
  readonly expiresInMs?: number;
  readonly expiresAt?: number;
}

export interface StoreEntry<TValue extends StoreValue = StoreValue> {
  readonly value: TValue;
  readonly expiresInMs?: number;
  readonly expiresAt?: number;
}

export interface Store {
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
}
