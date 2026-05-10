import { z } from "zod";

/**
 * Schema for the planner's structured output. Used with messages.parse() +
 * zodOutputFormat() so Anthropic's API validates the response shape for us.
 *
 * Constraints from Anthropic's structured-output spec:
 * - Object types with `additionalProperties: false` (Zod adds this)
 * - No recursive schemas
 * - Numerical / string length constraints not supported (we don't need them)
 */
export const CAPABILITIES = [
  "checkin",
  "checkin_info",
  "list_accounts",
  "bbs_daily_task",
  "redeem_code",
  "account_status",
  "mail_claim",
  "stamina_spend",
] as const;

export const PlannedTaskSchema = z.object({
  gameSlug: z
    .string()
    .describe(
      "Adapter slug. Must match one of the user's linked accounts. e.g. 'genshin', 'wuwa', 'arknights', 'genshin-cn'."
    ),
  capability: z
    .enum(CAPABILITIES)
    .describe("Capability to execute. Only live capabilities are valid."),
  rationale: z
    .string()
    .describe("One short sentence in the user's language: why this task is included."),
});

export const PlanSchema = z.object({
  reasoning: z
    .string()
    .describe("1-3 sentences explaining the overall plan, in the user's language."),
  tasks: z
    .array(PlannedTaskSchema)
    .describe("Ordered list of tasks to execute. Empty if nothing to do."),
  unsupportedRequests: z
    .array(z.string())
    .describe(
      "Things the user asked for that we can't fulfill. Empty array if none."
    ),
});

export type Plan = z.infer<typeof PlanSchema>;
export type PlannedTask = z.infer<typeof PlannedTaskSchema>;
