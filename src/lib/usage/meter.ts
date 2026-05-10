/**
 * Per-user monthly usage meter.
 *
 * One row per (userId, period) where period is "YYYY-MM" UTC. Increment
 * counters in runTask (task count) and proposePlan (plan call count + LLM
 * tokens + cost). Read from quota enforcement.
 */

import { prisma } from "@/lib/prisma";

export function currentPeriod(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export interface MeterReading {
  taskCount: number;
  planCallCount: number;
  llmTokensIn: number;
  llmTokensOut: number;
  llmCostUsdMicro: bigint;
}

const ZERO_READING: MeterReading = {
  taskCount: 0,
  planCallCount: 0,
  llmTokensIn: 0,
  llmTokensOut: 0,
  llmCostUsdMicro: 0n,
};

export async function readMeter(
  userId: string,
  period: string = currentPeriod()
): Promise<MeterReading> {
  const row = await prisma.usageMeter.findUnique({
    where: { userId_period: { userId, period } },
    select: {
      taskCount: true,
      planCallCount: true,
      llmTokensIn: true,
      llmTokensOut: true,
      llmCostUsdMicro: true,
    },
  });
  return row ?? ZERO_READING;
}

export async function incrementTaskCount(userId: string, by = 1): Promise<void> {
  const period = currentPeriod();
  await prisma.usageMeter.upsert({
    where: { userId_period: { userId, period } },
    create: { userId, period, taskCount: by },
    update: { taskCount: { increment: by } },
  });
}

export interface PlanCallUsage {
  tokensIn: number;
  tokensOut: number;
  /** Cost in USD * 1e6 (micro-dollars), to avoid float arithmetic. */
  costUsdMicro: bigint;
}

export async function incrementPlanCall(
  userId: string,
  usage: PlanCallUsage
): Promise<void> {
  const period = currentPeriod();
  await prisma.usageMeter.upsert({
    where: { userId_period: { userId, period } },
    create: {
      userId,
      period,
      planCallCount: 1,
      llmTokensIn: usage.tokensIn,
      llmTokensOut: usage.tokensOut,
      llmCostUsdMicro: usage.costUsdMicro,
    },
    update: {
      planCallCount: { increment: 1 },
      llmTokensIn: { increment: usage.tokensIn },
      llmTokensOut: { increment: usage.tokensOut },
      llmCostUsdMicro: { increment: usage.costUsdMicro },
    },
  });
}

export function usdToMicroDollars(usd: number): bigint {
  return BigInt(Math.round(usd * 1_000_000));
}
