import { describe, expect, it } from "vitest";

import { defaultKeyGenerator } from "../../src/express.js";

describe("defaultKeyGenerator", () => {
  it("uses x-forwarded-for before direct IP fields", () => {
    expect(
      defaultKeyGenerator({
        ip: "10.0.0.2",
        headers: {
          "x-forwarded-for": "203.0.113.10, 10.0.0.1",
        },
      }),
    ).toBe("203.0.113.10");
  });

  it("uses request IP when forwarded headers are absent", () => {
    expect(defaultKeyGenerator({ ip: "203.0.113.20" })).toBe("203.0.113.20");
  });

  it("falls back to socket remote address", () => {
    expect(
      defaultKeyGenerator({
        socket: { remoteAddress: "203.0.113.30" },
      }),
    ).toBe("203.0.113.30");
  });

  it("uses unknown as a final fallback", () => {
    expect(defaultKeyGenerator({})).toBe("unknown");
  });
});
