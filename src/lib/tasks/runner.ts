/**
 * Generic task runner — the single chokepoint through which every adapter
 * task call must flow. Persists a Task row in pending → running → done state,
 * dual-writes CheckInLog for backward-compat with M1 dashboards/queries.
 *
 * Used by:
 *   - POST /api/tasks
 *   - POST /api/cron/checkin   (one task per account in a loop)
 *   - POST /api/agent          (skill-driven)
 *   - POST /api/checkin/...    (legacy aliases, will be deprecated in M3)
 */

import { prisma } from "@/lib/prisma";
import { buildCreds } from "@/lib/credentials";
import { getAdapter } from "@/adapters";
import type { Capability, TaskResult } from "@/adapters/types";
import type { GameAccount, Prisma } from "@prisma/client";
import { Prisma as PrismaNs } from "@prisma/client";

export type TriggerSource =
  | "manual"
  | "cron"
  | "skill"
  | "agent"
  | "template";

export interface RunTaskInput {
  userId: string;
  gameSlug: string;
  capability: Capability;
  params?: Record<string, unknown>;
  /** If known, skips GameAccount lookup. Otherwise we resolve via (userId, gameSlug). */
  gameAccountId?: string;
  triggeredBy: TriggerSource;
  templateRunId?: string;
  templateStepIdx?: number;
}

export interface RunTaskOutcome {
  taskId: string;
  result: TaskResult;
}

export async function runTask(input: RunTaskInput): Promise<RunTaskOutcome> {
  const startedAt = new Date();

  const task = await prisma.task.create({
    data: {
      userId: input.userId,
      gameSlug: input.gameSlug,
      capability: input.capability,
      gameAccountId: input.gameAccountId ?? null,
      status: "running",
      backendTier: "L1",
      payload: (input.params ?? PrismaNs.JsonNull) as Prisma.InputJsonValue,
      triggeredBy: input.triggeredBy,
      templateRunId: input.templateRunId ?? null,
      templateStepIdx: input.templateStepIdx ?? null,
      startedAt,
      screenshotUrls: [],
    },
  });

  const adapter = getAdapter(input.gameSlug);
  if (!adapter) {
    return finalize(task.id, startedAt, null, {
      status: "failed",
      message: `No adapter registered for game: ${input.gameSlug}`,
    });
  }

  let account: GameAccount | null;
  if (input.gameAccountId) {
    account = await prisma.gameAccount.findUnique({
      where: { id: input.gameAccountId },
    });
  } else {
    account = await prisma.gameAccount.findFirst({
      where: { userId: input.userId, gameId: input.gameSlug, isActive: true },
    });
  }

  if (!account) {
    return finalize(task.id, startedAt, null, {
      status: "failed",
      message: `No linked ${input.gameSlug} account for this user`,
    });
  }

  // Backfill gameAccountId on the task if we just resolved it.
  if (!task.gameAccountId) {
    await prisma.task.update({
      where: { id: task.id },
      data: { gameAccountId: account.id },
    });
  }

  let result: TaskResult;
  try {
    const creds = buildCreds(account);
    result = await adapter.execute(
      { capability: input.capability, params: input.params },
      creds
    );
  } catch (e) {
    result = {
      status: "failed",
      message: e instanceof Error ? e.message : "Unknown error during execution",
    };
  }

  return finalize(task.id, startedAt, account, result, {
    triggeredBy: input.triggeredBy,
    capability: input.capability,
    userId: input.userId,
  });
}

interface CompatContext {
  triggeredBy: TriggerSource;
  capability: Capability;
  userId: string;
}

async function finalize(
  taskId: string,
  startedAt: Date,
  account: GameAccount | null,
  result: TaskResult,
  compat?: CompatContext
): Promise<RunTaskOutcome> {
  const finishedAt = new Date();
  const durationMs = finishedAt.getTime() - startedAt.getTime();

  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: result.status,
      result: (result.data ?? PrismaNs.JsonNull) as Prisma.InputJsonValue,
      errorMessage:
        result.status === "failed" || result.status === "skipped"
          ? result.message
          : null,
      finishedAt,
      cost: { ms: durationMs } as Prisma.InputJsonValue,
    },
  });

  // Backward-compat dual-write of CheckInLog for `checkin` capability.
  if (compat && account && compat.capability === "checkin") {
    const dbStatus =
      result.status === "already_done" ? "already_claimed" : result.status;
    await prisma.checkInLog.create({
      data: {
        gameAccountId: account.id,
        userId: compat.userId,
        gameId: account.gameId,
        status: dbStatus,
        reward: result.reward || null,
        errorMessage:
          result.status === "success" || result.status === "already_done"
            ? null
            : result.message,
        triggeredBy: compat.triggeredBy,
      },
    });

    if (result.status === "success") {
      await prisma.gameAccount.update({
        where: { id: account.id },
        data: { lastCheckin: new Date() },
      });
    }
  }

  return { taskId, result };
}
