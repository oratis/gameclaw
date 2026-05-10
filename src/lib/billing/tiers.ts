/**
 * Pricing tiers — placeholder values per user direction (2026-05).
 *
 * Pro+'s primary differentiator is AI Planner quota (5× Pro's).
 * Tier 1 (Free) → tier 4 (Enterprise). Free is the default; everything else
 * requires an active PayPal subscription (mapped via PAYPAL_PLAN_IDS).
 */

export type TierId = "free" | "pro" | "proplus" | "enterprise";

export interface TierConfig {
  id: TierId;
  displayName: string;
  /** Monthly fee in USD. */
  priceMonthly: number;
  /** -1 = unlimited */
  monthlyTaskQuota: number;
  /** -1 = unlimited */
  monthlyPlanCallQuota: number;
  /** Whether L3 (M3 future) capabilities are unlocked. */
  l3Enabled: boolean;
  /** Tagline for the pricing card. */
  blurb: string;
  /** Bullet-point features for the pricing card. */
  features: string[];
}

export const TIERS: Record<TierId, TierConfig> = {
  free: {
    id: "free",
    displayName: "Free",
    priceMonthly: 0,
    monthlyTaskQuota: 90,
    monthlyPlanCallQuota: 5,
    l3Enabled: false,
    blurb: "Try every adapter — daily check-ins, one game.",
    features: [
      "90 task runs / month",
      "5 AI Planner calls / month",
      "All 10+ games (1–2 linked accounts)",
      "Cloud cron daily at 1am Asia/Shanghai",
      "Encrypted credentials at rest",
    ],
  },
  pro: {
    id: "pro",
    displayName: "Pro",
    priceMonthly: 5,
    monthlyTaskQuota: 1500,
    monthlyPlanCallQuota: 30,
    l3Enabled: false,
    blurb: "Unlimited games, unlimited accounts, daily routines.",
    features: [
      "1,500 task runs / month",
      "30 AI Planner calls / month",
      "Unlimited linked accounts",
      "Custom daily routines (TaskTemplate)",
      "Discord notifications on failure",
    ],
  },
  proplus: {
    id: "proplus",
    displayName: "Pro+",
    priceMonthly: 15,
    monthlyTaskQuota: 5000,
    monthlyPlanCallQuota: 150,
    l3Enabled: true,
    blurb: "Heavy AI Planner usage. 5× Pro's plan budget.",
    features: [
      "5,000 task runs / month",
      "150 AI Planner calls / month — heavy use",
      "Priority queue (faster scheduling)",
      "Webhook event stream",
      "L3 worker (M3 — coming soon)",
    ],
  },
  enterprise: {
    id: "enterprise",
    displayName: "Enterprise",
    priceMonthly: 50,
    monthlyTaskQuota: -1,
    monthlyPlanCallQuota: -1,
    l3Enabled: true,
    blurb: "Guilds, studios, white-label.",
    features: [
      "Unlimited tasks + plans",
      "SLA + dedicated worker pool",
      "SSO + audit logs",
      "Self-host option",
      "Custom adapter requests",
    ],
  },
};

export const TIER_ORDER: TierId[] = ["free", "pro", "proplus", "enterprise"];

export function isPaidTier(tier: TierId): boolean {
  return tier !== "free";
}

/**
 * Map our internal tier to a PayPal plan ID. Configured at deploy time via
 * env var so the same code can run against PayPal sandbox and live.
 *
 * Set: PAYPAL_PLAN_PRO=P-XXX, PAYPAL_PLAN_PROPLUS=P-YYY, PAYPAL_PLAN_ENTERPRISE=P-ZZZ
 */
export function paypalPlanIdForTier(tier: TierId): string | null {
  switch (tier) {
    case "pro":
      return process.env.PAYPAL_PLAN_PRO ?? null;
    case "proplus":
      return process.env.PAYPAL_PLAN_PROPLUS ?? null;
    case "enterprise":
      return process.env.PAYPAL_PLAN_ENTERPRISE ?? null;
    default:
      return null;
  }
}
