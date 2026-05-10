import { describe, it, expect } from "vitest";
import { computeCostUsd } from "./cost";

describe("computeCostUsd", () => {
  it("computes opus-4-7 base price (no cache)", () => {
    // 1M input + 1M output should equal $5 + $25 = $30
    const cost = computeCostUsd("claude-opus-4-7", {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
    });
    expect(cost).toBeCloseTo(30, 4);
  });

  it("applies cache read discount", () => {
    // 1M cache reads on opus = $0.50 (10% of base input)
    const cost = computeCostUsd("claude-opus-4-7", {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadInputTokens: 1_000_000,
      cacheCreationInputTokens: 0,
    });
    expect(cost).toBeCloseTo(0.5, 4);
  });

  it("applies cache write premium", () => {
    // 1M cache writes on opus = $6.25 (125% of base input)
    const cost = computeCostUsd("claude-opus-4-7", {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(6.25, 4);
  });

  it("returns 0 for unknown model (fail safe)", () => {
    const cost = computeCostUsd("unknown-model", {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
    });
    expect(cost).toBe(0);
  });

  it("realistic per-call cost is small (< $0.05)", () => {
    // Typical planner call: ~2000 input (mostly cached) + ~500 output
    const cost = computeCostUsd("claude-opus-4-7", {
      inputTokens: 500,
      outputTokens: 500,
      cacheReadInputTokens: 1500,
      cacheCreationInputTokens: 0,
    });
    expect(cost).toBeLessThan(0.05);
  });
});
