import { describe, it, expect } from "vitest";
import { currentPeriod, usdToMicroDollars } from "./meter";

describe("currentPeriod", () => {
  it("returns YYYY-MM in UTC", () => {
    expect(currentPeriod(new Date(Date.UTC(2026, 4, 11)))).toBe("2026-05");
    expect(currentPeriod(new Date(Date.UTC(2026, 0, 1)))).toBe("2026-01");
    expect(currentPeriod(new Date(Date.UTC(2026, 11, 31, 23, 59)))).toBe("2026-12");
  });

  it("zero-pads single-digit months", () => {
    expect(currentPeriod(new Date(Date.UTC(2026, 2, 5)))).toBe("2026-03");
  });
});

describe("usdToMicroDollars", () => {
  it("converts cleanly", () => {
    expect(usdToMicroDollars(0)).toBe(0n);
    expect(usdToMicroDollars(1)).toBe(1_000_000n);
    expect(usdToMicroDollars(0.0125)).toBe(12_500n);
    expect(usdToMicroDollars(0.000001)).toBe(1n);
  });

  it("rounds half away from zero", () => {
    expect(usdToMicroDollars(0.0000005)).toBe(1n);
  });
});
