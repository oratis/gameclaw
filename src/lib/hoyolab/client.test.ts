import { describe, it, expect } from "vitest";
import { HoYoLabClient } from "./client";

describe("HoYoLabClient", () => {
  it("accepts valid cookie values", () => {
    expect(() => new HoYoLabClient("v2_AbC123", "12345678")).not.toThrow();
    expect(() => new HoYoLabClient("a-b_c.d/e=f+g", "ltuid_v2_abc")).not.toThrow();
  });

  it("rejects cookie values with injection characters", () => {
    expect(() => new HoYoLabClient("token; malicious=1", "123")).toThrow(/Invalid cookie/);
    expect(() => new HoYoLabClient("token\nmalicious", "123")).toThrow(/Invalid cookie/);
    expect(() => new HoYoLabClient("valid", "uid with space")).toThrow(/Invalid cookie/);
  });

  it("rejects empty cookie values", () => {
    expect(() => new HoYoLabClient("", "123")).toThrow(/Invalid cookie/);
    expect(() => new HoYoLabClient("valid", "")).toThrow(/Invalid cookie/);
  });
});
