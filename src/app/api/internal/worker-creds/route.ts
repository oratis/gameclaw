/**
 * Credential delivery endpoint for L3 workers.
 *
 * Worker presents (taskId, callbackToken). On match, we look up the linked
 * GameAccount, decrypt credentials, and return them as a JSON map. Workers
 * use these to drive the in-emulator game session.
 *
 * Security:
 *   - Token is the same one-time string from WorkerJob.callbackToken
 *   - Constant-time comparison
 *   - Tokens that have been used for terminal callback (callbackUsed=true)
 *     are rejected — no replay
 *   - Each worker should fetch creds at most once per execution
 *
 * Body:
 *   { taskId, callbackToken }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { constantTimeEqualHex } from "@/lib/l3/auth";
import { buildCreds } from "@/lib/credentials";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const taskId = typeof body.taskId === "string" ? body.taskId : "";
  const token = typeof body.callbackToken === "string" ? body.callbackToken : "";
  if (!taskId || !token) {
    return NextResponse.json(
      { error: "taskId and callbackToken are required" },
      { status: 400 }
    );
  }

  const job = await prisma.workerJob.findUnique({
    where: { taskId },
    select: { callbackToken: true, callbackUsed: true },
  });
  if (!job) {
    return NextResponse.json({ error: "Unknown task" }, { status: 404 });
  }
  if (!constantTimeEqualHex(token, job.callbackToken)) {
    logger.warn("worker-creds bad token", { taskId });
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
  if (job.callbackUsed) {
    return NextResponse.json(
      { error: "Token already used (terminal callback)" },
      { status: 409 }
    );
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { gameAccount: true },
  });
  if (!task || !task.gameAccount) {
    return NextResponse.json(
      { error: "Task or game account not found" },
      { status: 404 }
    );
  }

  let creds;
  try {
    creds = buildCreds(task.gameAccount);
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Failed to load credentials",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    taskId,
    gameSlug: task.gameSlug,
    capability: task.capability,
    payload: task.payload,
    account: {
      uid: task.gameAccount.uid,
      nickname: task.gameAccount.nickname,
      server: task.gameAccount.server,
    },
    credentials: creds,
  });
}
