/**
 * L3 worker dispatcher.
 *
 * Path:
 *   runTask(T3 capability)
 *     → dispatchL3Task()
 *       → checkCircuit() — refuse if vendor's circuit breaker is open
 *       → resolve worker pool by gameSlug
 *       → create WorkerJob row + one-time callbackToken
 *       → call Cloud Run Jobs API to start an execution
 *       → return "running" status (worker writes back via /api/internal/worker-callback)
 *
 * The Task row stays in "running" until the worker callback flips it to
 * success/failed. AI Verifier (verifier.ts) post-processes the screenshots.
 */

import type { Capability, Credentials, Task, TaskResult } from "@/adapters/types";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { generateCallbackToken } from "./auth";
import { dispatchCloudRunJob } from "./cloudrun";
import { checkCircuit } from "@/lib/billing/circuit";

export interface L3DispatchInput {
  taskId: string;
  creds: Credentials;
  task: Task;
  gameSlug: string;
  uid?: string;
}

function poolForGameSlug(gameSlug: string): string {
  // Map adapter slug → worker pool. e.g. "arknights" → "l3-arknights".
  // Multi-region adapters map to the same pool (e.g. genshin / genshin-cn → l3-genshin).
  const base = gameSlug.replace(/-cn$/, "");
  return `l3-${base}`;
}

export async function dispatchL3Task(
  input: L3DispatchInput
): Promise<TaskResult> {
  // 1. Risk circuit breaker — refuse if vendor is suspended.
  const circuit = await checkCircuit(`adapter:${input.gameSlug}`);
  if (circuit.state === "open") {
    return {
      status: "skipped",
      message: `L3 dispatch skipped: circuit breaker is OPEN for ${input.gameSlug} — recent failure rate ${(circuit.failureRate * 100).toFixed(1)}%`,
    };
  }

  // 2. Allocate WorkerJob row + token.
  const pool = poolForGameSlug(input.gameSlug);
  const callbackToken = generateCallbackToken();
  const job = await prisma.workerJob.create({
    data: {
      taskId: input.taskId,
      pool,
      callbackToken,
      executionState: "PENDING",
    },
  });

  // 3. Dispatch via Cloud Run Jobs.
  try {
    const out = await dispatchCloudRunJob({
      pool,
      taskId: input.taskId,
      callbackToken,
    });
    await prisma.workerJob.update({
      where: { id: job.id },
      data: {
        executionName: out.executionName,
        executionState: "RUNNING",
        startedAt: new Date(),
      },
    });
    logger.info("L3 dispatched", {
      taskId: input.taskId,
      pool,
      executionName: out.executionName,
    });
    return {
      status: "success",
      message: `L3 worker dispatched (${pool}). Result will arrive via callback.`,
      data: { executionName: out.executionName, pool },
    };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    await prisma.workerJob.update({
      where: { id: job.id },
      data: {
        executionState: "FAILED",
        errorMessage: errMsg,
        completedAt: new Date(),
      },
    });
    logger.error("L3 dispatch failed", e, { taskId: input.taskId, pool });
    return {
      status: "failed",
      message: `L3 dispatch failed: ${errMsg}`,
    };
  }
}

export type { Capability };
