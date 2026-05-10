/**
 * Token-usage → USD conversion for the AI planner.
 * Pricing as of 2026-04 (claude-api skill catalog):
 *
 *   claude-opus-4-7   : $5  / $25  per 1M (input/output)
 *   claude-sonnet-4-6 : $3  / $15  per 1M
 *   claude-haiku-4-5  : $1  / $5   per 1M
 *
 *   Cache reads cost ~10% of base input ($0.50/M for opus-4-7)
 *   Cache writes cost ~125% of base input ($6.25/M, 5-min TTL)
 */

interface ModelPrice {
  inputPerM: number;
  outputPerM: number;
  cacheReadPerM: number;
  cacheWritePerM: number;
}

const PRICES: Record<string, ModelPrice> = {
  "claude-opus-4-7": {
    inputPerM: 5.0,
    outputPerM: 25.0,
    cacheReadPerM: 0.5,
    cacheWritePerM: 6.25,
  },
  "claude-sonnet-4-6": {
    inputPerM: 3.0,
    outputPerM: 15.0,
    cacheReadPerM: 0.3,
    cacheWritePerM: 3.75,
  },
  "claude-haiku-4-5": {
    inputPerM: 1.0,
    outputPerM: 5.0,
    cacheReadPerM: 0.1,
    cacheWritePerM: 1.25,
  },
};

export interface UsageBreakdown {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}

export function computeCostUsd(model: string, usage: UsageBreakdown): number {
  const price = PRICES[model];
  if (!price) return 0;
  return (
    (usage.inputTokens * price.inputPerM +
      usage.outputTokens * price.outputPerM +
      usage.cacheReadInputTokens * price.cacheReadPerM +
      usage.cacheCreationInputTokens * price.cacheWritePerM) /
    1_000_000
  );
}
