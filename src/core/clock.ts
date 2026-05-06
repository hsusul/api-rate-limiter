export interface Clock {
  now(): number;
  nowDate(): Date;
}

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }

  nowDate(): Date {
    return new Date(this.now());
  }
}

export class ManualClock implements Clock {
  #currentTimeMs: number;

  constructor(initialTime: number | Date = 0) {
    this.#currentTimeMs = toTimestamp(initialTime);
  }

  now(): number {
    return this.#currentTimeMs;
  }

  nowDate(): Date {
    return new Date(this.#currentTimeMs);
  }

  set(time: number | Date): void {
    this.#currentTimeMs = toTimestamp(time);
  }

  advance(ms: number): void {
    this.#currentTimeMs += ms;
  }
}

export const systemClock = new SystemClock();

function toTimestamp(time: number | Date): number {
  return time instanceof Date ? time.getTime() : time;
}
