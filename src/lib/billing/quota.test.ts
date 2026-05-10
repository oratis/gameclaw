import { describe, it, expect } from "vitest";
import { TIERS, paypalPlanIdForTier, isPaidTier } from "./tiers";
import {
  L3NotEntitledError,
  QuotaExceededError,
  requiresL3,
} from "./quota";

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

describe("requiresL3", () => {
  it("flags T3 capabilities as L3", () => {
    expect(requiresL3("weekly_dungeon")).toBe(true);
    expect(requiresL3("infrastructure_shift")).toBe(true);
    expect(requiresL3("material_farm")).toBe(true);
    expect(requiresL3("auto_battle")).toBe(true);
  });

  it("does not flag T1/T2 capabilities as L3", () => {
    expect(requiresL3("checkin")).toBe(false);
    expect(requiresL3("checkin_info")).toBe(false);
    expect(requiresL3("bbs_daily_task")).toBe(false);
    expect(requiresL3("redeem_code")).toBe(false);
    expect(requiresL3("mail_claim")).toBe(false);
    expect(requiresL3("stamina_spend")).toBe(false);
  });
});

describe("error classes", () => {
  it("QuotaExceededError carries kind + decision", () => {
    const err = new QuotaExceededError(
      { allowed: false, tier: "free", limit: 90, used: 90, reason: "out" },
      "task"
    );
    expect(err.code).toBe("quota_exceeded");
    expect(err.kind).toBe("task");
    expect(err.decision.used).toBe(90);
    expect(err).toBeInstanceOf(Error);
  });

  it("L3NotEntitledError carries tier + capability", () => {
    const err = new L3NotEntitledError("free", "weekly_dungeon");
    expect(err.code).toBe("l3_not_entitled");
    expect(err.tier).toBe("free");
    expect(err.capability).toBe("weekly_dungeon");
    expect(err.message).toContain("Pro+");
    expect(err).toBeInstanceOf(Error);
  });
});
