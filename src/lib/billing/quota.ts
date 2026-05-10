/**
 * Quota enforcement. Called BEFORE running a task or planner call.
 *
 * Reads the user's effective tier (default: free) and current period's
 * usage meter; returns an allow/deny decision plus the quota numbers so
 * routes can include them in error responses.
 */

import { prisma } from "@/lib/prisma";
import { readMeter } from "@/lib/usage/meter";
import { TIERS, type TierId } from "./tiers";

export type QuotaKind = "task" | "plan_call";

export interface QuotaDecision {
  allowed: boolean;
  reason?: string;
  tier: TierId;
  /** -1 means unlimited. */
  limit: number;
  used: number;
}

export async function getEffectiveTier(userId: string): Promise<TierId> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { tier: true, status: true },
  });
  if (!sub) return "free";
  if (sub.status !== "active") return "free";
  if (sub.tier in TIERS) return sub.tier as TierId;
  return "free";
}

export async function checkQuota(
  userId: string,
  kind: QuotaKind
): Promise<QuotaDecision> {
  const tier = await getEffectiveTier(userId);
  const cfg = TIERS[tier];
  const meter = await readMeter(userId);

  const limit =
    kind === "task" ? cfg.monthlyTaskQuota : cfg.monthlyPlanCallQuota;
  const used = kind === "task" ? meter.taskCount : meter.planCallCount;

  // Unlimited tier
  if (limit === -1) {
    return { allowed: true, tier, limit, used };
  }

  if (used >= limit) {
    return {
      allowed: false,
      reason: `You've used ${used}/${limit} ${kind === "task" ? "task runs" : "AI Planner calls"} this month on the ${cfg.displayName} tier.`,
      tier,
      limit,
      used,
    };
  }

  return { allowed: true, tier, limit, used };
}
