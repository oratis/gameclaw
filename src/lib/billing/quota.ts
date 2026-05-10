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
import type { Capability } from "@/adapters/types";

export type QuotaKind = "task" | "plan_call";

/**
 * T3 capabilities — require an L3 worker (Pro+ only). M3 stack not live yet;
 * dispatcher returns a clear "not yet deployed" message until the worker
 * fleet ships.
 */
const L3_CAPABILITIES: ReadonlySet<Capability> = new Set([
  "weekly_dungeon",
  "infrastructure_shift",
  "material_farm",
  "auto_battle",
]);

export function requiresL3(capability: Capability): boolean {
  return L3_CAPABILITIES.has(capability);
}

export class QuotaExceededError extends Error {
  readonly code = "quota_exceeded";
  constructor(readonly decision: QuotaDecision, readonly kind: QuotaKind) {
    super(decision.reason ?? "Quota exceeded");
    this.name = "QuotaExceededError";
  }
}

export class L3NotEntitledError extends Error {
  readonly code = "l3_not_entitled";
  constructor(readonly tier: TierId, readonly capability: Capability) {
    super(
      `Capability '${capability}' requires Pro+ tier (L3 worker). Current tier: ${tier}.`
    );
    this.name = "L3NotEntitledError";
  }
}

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

/**
 * Throw if quota exhausted. Convenience wrapper for callers that prefer
 * exception-based control flow (runTask, planner).
 */
export async function enforceQuota(
  userId: string,
  kind: QuotaKind
): Promise<void> {
  const decision = await checkQuota(userId, kind);
  if (!decision.allowed) {
    throw new QuotaExceededError(decision, kind);
  }
}

/**
 * Throw if the user's tier doesn't entitle them to L3 worker capabilities.
 */
export async function enforceL3Entitlement(
  userId: string,
  capability: Capability
): Promise<void> {
  if (!requiresL3(capability)) return;
  const tier = await getEffectiveTier(userId);
  if (!TIERS[tier].l3Enabled) {
    throw new L3NotEntitledError(tier, capability);
  }
}
