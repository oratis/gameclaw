import { describe, it, expect } from "vitest";
import { generateCallbackToken, constantTimeEqualHex } from "./auth";

describe("generateCallbackToken", () => {
  it("returns 64 hex characters (32 bytes)", () => {
    const t = generateCallbackToken();
    expect(t).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns a unique value each call", () => {
    const a = generateCallbackToken();
    const b = generateCallbackToken();
    expect(a).not.toBe(b);
  });
});

describe("constantTimeEqualHex", () => {
  it("returns true for identical hex", () => {
    const t = generateCallbackToken();
    expect(constantTimeEqualHex(t, t)).toBe(true);
  });

  it("returns false for different hex", () => {
    const a = generateCallbackToken();
    const b = generateCallbackToken();
    expect(constantTimeEqualHex(a, b)).toBe(false);
  });

  it("returns false for empty input", () => {
    expect(constantTimeEqualHex("", "")).toBe(false);
  });

  it("returns false for length mismatch", () => {
    expect(constantTimeEqualHex("aa", "aabb")).toBe(false);
  });

  it("returns false for invalid hex", () => {
    expect(constantTimeEqualHex("zzzz", "aaaa")).toBe(false);
  });
});
