/**
 * Generic task API. The unified surface for all adapter capabilities
 * — checkin, mail_claim, status query, future T2/T3 tasks, etc.
 *
 * Eventually replaces /api/checkin and most /api/agent payloads. M2 keeps
 * the old routes working as aliases.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runTask } from "@/lib/tasks/runner";
import { hasAdapter } from "@/adapters";
import { checkQuota } from "@/lib/billing/quota";
import type { Capability } from "@/adapters/types";

const ALL_CAPABILITIES = new Set<Capability>([
  "checkin",
  "checkin_info",
  "list_accounts",
  "bbs_daily_task",
  "redeem_code",
  "account_status",
  "mail_claim",
  "stamina_spend",
]);

/**
 * GET — list the caller's recent tasks.
 *   ?limit=50  (default 50, max 200)
 *   ?status=running|success|failed
 *   ?gameSlug=genshin
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(
    parseInt(searchParams.get("limit") || "50", 10) || 50,
    200
  );
  const status = searchParams.get("status") || undefined;
  const gameSlug = searchParams.get("gameSlug") || undefined;

  const tasks = await prisma.task.findMany({
    where: {
      userId: session.user.id,
      ...(status && { status }),
      ...(gameSlug && { gameSlug }),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      gameSlug: true,
      capability: true,
      status: true,
      backendTier: true,
      triggeredBy: true,
      result: true,
      errorMessage: true,
      startedAt: true,
      finishedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ tasks });
}

/**
 * POST — execute one task synchronously (or several, if `tasks` array is given).
 *
 * Single task body:
 *   { gameSlug: "genshin", capability: "checkin", params?: {...} }
 *
 * Batch body:
 *   { tasks: [{gameSlug, capability, params?}, ...] }
 *
 * Both forms return `{ results: [...] }`.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const inputs: Array<{ gameSlug: string; capability: string; params?: Record<string, unknown> }> = Array.isArray(body.tasks)
    ? body.tasks
    : [{ gameSlug: body.gameSlug, capability: body.capability, params: body.params }];

  // Validation pass — fail fast on bad input before doing any work.
  for (const t of inputs) {
    if (!t || typeof t.gameSlug !== "string" || typeof t.capability !== "string") {
      return NextResponse.json(
        { error: "Each task must include gameSlug and capability" },
        { status: 400 }
      );
    }
    if (!hasAdapter(t.gameSlug)) {
      return NextResponse.json(
        { error: `Unknown gameSlug: ${t.gameSlug}` },
        { status: 400 }
      );
    }
    if (!ALL_CAPABILITIES.has(t.capability as Capability)) {
      return NextResponse.json(
        { error: `Unknown capability: ${t.capability}` },
        { status: 400 }
      );
    }
  }

  // Quota check before doing any work — one POST = one batch, but each task
  // counts toward the meter, so the user must have headroom for the whole batch.
  const quota = await checkQuota(session.user.id, "task");
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: quota.reason,
        code: "quota_exceeded",
        kind: "task",
        tier: quota.tier,
        used: quota.used,
        limit: quota.limit,
        upgradeUrl: "/pricing",
      },
      { status: 402 }
    );
  }

  const settled = await Promise.allSettled(
    inputs.map((t) =>
      runTask({
        userId: session.user.id!,
        gameSlug: t.gameSlug,
        capability: t.capability as Capability,
        params: t.params,
        triggeredBy: "manual",
      })
    )
  );

  const results = settled.map((s, i) => {
    if (s.status === "fulfilled") {
      return {
        gameSlug: inputs[i].gameSlug,
        capability: inputs[i].capability,
        taskId: s.value.taskId,
        ...s.value.result,
      };
    }
    return {
      gameSlug: inputs[i].gameSlug,
      capability: inputs[i].capability,
      status: "failed" as const,
      message: s.reason instanceof Error ? s.reason.message : "Unknown error",
    };
  });

  return NextResponse.json({ results });
}
