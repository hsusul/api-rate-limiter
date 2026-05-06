import { describe, expect, it } from "vitest";

import { packageName } from "../src/index.js";

describe("package entrypoint", () => {
  it("can be imported", () => {
    expect(packageName).toBe("api-rate-limiter");
  });
});
