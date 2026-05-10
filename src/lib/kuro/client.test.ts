import { describe, it, expect } from "vitest";
import { KuroClient } from "./client";

describe("KuroClient", () => {
  it("accepts a JWT-shaped token", () => {
    expect(
      () =>
        new KuroClient(
          "eyJhbGciOiJIUzI1NiJ9.eyJjcmVhdGVkIjoxNjg5NDk4MDkxMjQ1LCJ1c2VySWQiOjEwMDY1NjY5fQ.AAAA_BBBB-CCCC.dd"
        )
    ).not.toThrow();
  });

  it("rejects empty tokens", () => {
    expect(() => new KuroClient("")).toThrow(/Invalid Kuro token/);
  });

  it("rejects tokens with header-injection characters", () => {
    expect(() => new KuroClient("token; evil=1")).toThrow(/Invalid Kuro token/);
    expect(() => new KuroClient("tok\nen")).toThrow(/Invalid Kuro token/);
    expect(() => new KuroClient("tok en")).toThrow(/Invalid Kuro token/);
  });
});
