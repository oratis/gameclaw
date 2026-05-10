/**
 * AI Planner — converts a natural-language user request into a structured
 * task plan that the GameClaw runtime can execute.
 *
 * Architecture:
 *   user prompt + their accounts → Claude (Opus 4.7, adaptive thinking, structured output)
 *   → validated Plan { reasoning, tasks[], unsupportedRequests[] }
 *
 * The system prompt is cached (5-min TTL) for cost efficiency on repeated calls.
 * The user message contains volatile content (account list, the request) and is NOT cached.
 */

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { CAPABILITIES, PlanSchema, type Plan, type PlannedTask } from "./schema";
import { PLANNER_SYSTEM_PROMPT } from "./system-prompt";
import { computeCostUsd } from "./cost";
import { incrementPlanCall, usdToMicroDollars } from "@/lib/usage/meter";

// Re-export for convenience.
export type { Plan, PlannedTask };
export { CAPABILITIES };

const PLANNER_MODEL = "claude-opus-4-7";

export interface PlannerAccount {
  /** Adapter slug, e.g. "genshin", "wuwa" */
  slug: string;
  displayName: string;
  vendor: string;
  capabilities: string[];
  /** In-game UID, helps the model disambiguate when multiple accounts share a slug. */
  uid?: string;
  nickname?: string | null;
}

export interface PlannerInput {
  prompt: string;
  accounts: PlannerAccount[];
  /** Optional locale hint to nudge the model's response language. */
  locale?: string;
  /** Caller's user ID — used for usage metering. Optional for testing. */
  userId?: string;
}

export interface PlannerOutcome {
  plan: Plan;
  usage: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens: number;
    cacheCreationInputTokens: number;
    costUsd: number;
  };
}

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic();
  }
  return _client;
}

function renderUserMessage(input: PlannerInput): string {
  const accountsBlock = input.accounts.length
    ? input.accounts
        .map((a) => {
          const head = `- ${a.slug} (${a.displayName}, vendor=${a.vendor})`;
          const caps = `  capabilities: ${a.capabilities.join(", ")}`;
          const role =
            a.uid || a.nickname
              ? `  account: uid=${a.uid ?? "?"}, nickname=${a.nickname ?? "?"}`
              : "";
          return [head, caps, role].filter(Boolean).join("\n");
        })
        .join("\n")
    : "(no accounts linked)";

  const localeLine = input.locale
    ? `\n\nUser's UI locale: ${input.locale}. Respond in their language.`
    : "";

  return `# Available accounts

${accountsBlock}${localeLine}

# User request

${input.prompt}`;
}

export async function proposePlan(input: PlannerInput): Promise<PlannerOutcome> {
  const client = getClient();

  const response = await client.messages.parse({
    model: PLANNER_MODEL,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: zodOutputFormat(PlanSchema),
    },
    system: [
      {
        type: "text",
        text: PLANNER_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: renderUserMessage(input),
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error(
      `Planner did not return parsable output (stop_reason=${response.stop_reason})`
    );
  }

  const plan = response.parsed_output;

  const inputTokens = response.usage.input_tokens ?? 0;
  const outputTokens = response.usage.output_tokens ?? 0;
  const cacheReadInputTokens = response.usage.cache_read_input_tokens ?? 0;
  const cacheCreationInputTokens =
    response.usage.cache_creation_input_tokens ?? 0;

  const costUsd = computeCostUsd(PLANNER_MODEL, {
    inputTokens,
    outputTokens,
    cacheReadInputTokens,
    cacheCreationInputTokens,
  });

  if (input.userId) {
    // Best-effort metering; never let a billing-side hiccup fail a successful plan.
    incrementPlanCall(input.userId, {
      tokensIn: inputTokens + cacheReadInputTokens + cacheCreationInputTokens,
      tokensOut: outputTokens,
      costUsdMicro: usdToMicroDollars(costUsd),
    }).catch(() => undefined);
  }

  return {
    plan,
    usage: {
      model: PLANNER_MODEL,
      inputTokens,
      outputTokens,
      cacheReadInputTokens,
      cacheCreationInputTokens,
      costUsd,
    },
  };
}
