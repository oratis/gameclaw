import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { runTask } from "@/lib/tasks/runner";

/**
 * Scheduled auto check-in endpoint.
 * Called by Cloud Scheduler daily.
 *
 * Auth: Bearer token via CRON_SECRET env var.
 * Iterates all active game accounts with autoCheckin=true and runs the
 * `checkin` capability through the unified task runner. Each invocation
 * writes a Task row (and dual-writes CheckInLog for compat).
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const accounts = await prisma.gameAccount.findMany({
    where: { isActive: true, autoCheckin: true },
  });

  logger.info("cron checkin started", { accountCount: accounts.length });

  let success = 0;
  let alreadyClaimed = 0;
  let failed = 0;

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    try {
      const { result } = await runTask({
        userId: account.userId,
        gameSlug: account.gameId,
        gameAccountId: account.id,
        capability: "checkin",
        triggeredBy: "cron",
      });

      if (result.status === "success") success++;
      else if (result.status === "already_done") alreadyClaimed++;
      else failed++;
    } catch (error) {
      failed++;
      logger.error("cron checkin error", error, {
        userId: account.userId,
        gameAccountId: account.id,
        gameId: account.gameId,
      });
    }

    // Spacing between accounts to avoid upstream rate limiting.
    if (i < accounts.length - 1) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  const summary = {
    processed: accounts.length,
    success,
    alreadyClaimed,
    failed,
    durationMs: Date.now() - startedAt,
  };

  logger.info("cron checkin finished", summary);

  return NextResponse.json(summary);
}
