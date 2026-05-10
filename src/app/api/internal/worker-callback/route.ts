/**
 * Worker callback — workers running in Cloud Run Jobs (or other backends)
 * post here to update task progress and final results.
 *
 * Auth: callbackToken in request body, compared against WorkerJob.callbackToken
 * in constant time. Single-use for terminal status updates (status =
 * "succeeded" | "failed" flips callbackUsed=true).
 *
 * Body:
 *   {
 *     taskId: string,
 *     callbackToken: string,
 *     status: "running" | "succeeded" | "failed",
 *     message?: string,
 *     reward?: string,
 *     screenshotUrls?: string[],   // GCS URLs uploaded by worker
 *     errorMessage?: string,
 *     resultData?: object,
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { constantTimeEqualHex } from "@/lib/l3/auth";
import { verifyL3Task } from "@/lib/l3/verifier";
import { updateCircuitForScope } from "@/lib/billing/circuit";
import { Prisma } from "@prisma/client";

const TERMINAL_STATUSES = new Set(["succeeded", "failed"]);

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const taskId = typeof body.taskId === "string" ? body.taskId : "";
  const callbackToken =
    typeof body.callbackToken === "string" ? body.callbackToken : "";
  const status = typeof body.status === "string" ? body.status : "";

  if (!taskId || !callbackToken || !status) {
    return NextResponse.json(
      { error: "taskId, callbackToken, and status are required" },
      { status: 400 }
    );
  }

  const job = await prisma.workerJob.findUnique({
    where: { taskId },
    select: {
      id: true,
      callbackToken: true,
      callbackUsed: true,
      executionState: true,
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Unknown task" }, { status: 404 });
  }

  if (!constantTimeEqualHex(callbackToken, job.callbackToken)) {
    logger.warn("worker-callback bad token", { taskId });
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  if (job.callbackUsed && TERMINAL_STATUSES.has(status)) {
    return NextResponse.json(
      { error: "Callback token already used for terminal status" },
      { status: 409 }
    );
  }

  const isTerminal = TERMINAL_STATUSES.has(status);
  const isSuccess = status === "succeeded";

  // Translate worker status into Task row status
  const taskStatus = isSuccess
    ? "success"
    : status === "failed"
      ? "failed"
      : "running";

  const reward = typeof body.reward === "string" ? body.reward : undefined;
  const message = typeof body.message === "string" ? body.message : undefined;
  const errorMessage =
    typeof body.errorMessage === "string" ? body.errorMessage : undefined;
  const screenshotUrls = Array.isArray(body.screenshotUrls)
    ? body.screenshotUrls.filter((u): u is string => typeof u === "string")
    : undefined;
  const resultData =
    body.resultData && typeof body.resultData === "object"
      ? (body.resultData as Prisma.InputJsonValue)
      : undefined;

  // Update WorkerJob
  await prisma.workerJob.update({
    where: { id: job.id },
    data: {
      executionState: isSuccess
        ? "SUCCEEDED"
        : status === "failed"
          ? "FAILED"
          : "RUNNING",
      callbackUsed: isTerminal ? true : job.callbackUsed,
      completedAt: isTerminal ? new Date() : null,
      screenshotUrls: screenshotUrls ?? undefined,
      errorMessage: errorMessage ?? null,
    },
  });

  // Update Task row + (if terminal) trigger AI Verifier and circuit-breaker update.
  if (isTerminal) {
    // Initial Task update with the worker's self-reported status.
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: taskStatus,
        finishedAt: new Date(),
        result: resultData ?? Prisma.JsonNull,
        errorMessage: !isSuccess ? errorMessage ?? message ?? null : null,
        screenshotUrls: screenshotUrls ?? [],
      },
    });

    // AI Verifier: only if worker reported success AND we have screenshots.
    // Best-effort — never let a verifier hiccup mark a real success as failed.
    if (isSuccess && screenshotUrls && screenshotUrls.length > 0) {
      const taskRow = await prisma.task.findUnique({
        where: { id: taskId },
        select: { capability: true, gameSlug: true },
      });
      if (taskRow) {
        const verdict = await verifyL3Task({
          capability: taskRow.capability,
          gameSlug: taskRow.gameSlug,
          screenshotUrls,
          workerMessage: message,
        });
        if (verdict?.recommendation === "reject") {
          await prisma.task.update({
            where: { id: taskId },
            data: {
              status: "failed",
              errorMessage: `AI Verifier disagrees with worker self-report: ${verdict.observation}`,
            },
          });
          logger.warn("worker-callback verifier overrode success", {
            taskId,
            verdict,
          });
        } else if (verdict) {
          // Annotate the task row with verifier metadata for audit.
          await prisma.task.update({
            where: { id: taskId },
            data: {
              result: {
                ...(typeof resultData === "object" && resultData !== null
                  ? (resultData as Record<string, unknown>)
                  : {}),
                _verifier: verdict,
              } as Prisma.InputJsonValue,
            },
          });
        }
      }
    }

    // Risk circuit breaker recompute — best-effort.
    const taskForCircuit = await prisma.task.findUnique({
      where: { id: taskId },
      select: { gameSlug: true },
    });
    if (taskForCircuit) {
      updateCircuitForScope(`adapter:${taskForCircuit.gameSlug}`).catch((e) =>
        logger.error("circuit update failed", e, { taskId })
      );
    }
  } else {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "running",
        screenshotUrls: screenshotUrls ?? undefined,
      },
    });
  }

  logger.info("worker-callback received", {
    taskId,
    status,
    isTerminal,
    reward,
  });

  return NextResponse.json({ ok: true });
}
