import { describe, it, expect } from "vitest";
import { TIERS, paypalPlanIdForTier, isPaidTier } from "./tiers";

describe("tiers", () => {
  it("Free is the default tier with restricted quotas", () => {
    expect(TIERS.free.priceMonthly).toBe(0);
    expect(TIERS.free.monthlyTaskQuota).toBe(90);
    expect(TIERS.free.monthlyPlanCallQuota).toBe(5);
    expect(TIERS.free.l3Enabled).toBe(false);
  });

  it("Pro+ has 5x Pro's plan call quota (per spec)", () => {
    expect(TIERS.proplus.monthlyPlanCallQuota).toBe(
      TIERS.pro.monthlyPlanCallQuota * 5
    );
  });

  it("Enterprise has unlimited (-1) quotas", () => {
    expect(TIERS.enterprise.monthlyTaskQuota).toBe(-1);
    expect(TIERS.enterprise.monthlyPlanCallQuota).toBe(-1);
  });

  it("isPaidTier returns true for non-free", () => {
    expect(isPaidTier("free")).toBe(false);
    expect(isPaidTier("pro")).toBe(true);
    expect(isPaidTier("proplus")).toBe(true);
    expect(isPaidTier("enterprise")).toBe(true);
  });

  it("paypalPlanIdForTier returns null when env not configured", () => {
    delete process.env.PAYPAL_PLAN_PRO;
    expect(paypalPlanIdForTier("pro")).toBeNull();
    expect(paypalPlanIdForTier("free")).toBeNull();
  });

  it("paypalPlanIdForTier returns env value when set", () => {
    process.env.PAYPAL_PLAN_PRO = "P-test-pro";
    process.env.PAYPAL_PLAN_PROPLUS = "P-test-proplus";
    expect(paypalPlanIdForTier("pro")).toBe("P-test-pro");
    expect(paypalPlanIdForTier("proplus")).toBe("P-test-proplus");
    delete process.env.PAYPAL_PLAN_PRO;
    delete process.env.PAYPAL_PLAN_PROPLUS;
  });
});
