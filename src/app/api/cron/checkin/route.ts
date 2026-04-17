import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { performCheckin } from "@/lib/hoyolab/checkin";
import { logger } from "@/lib/logger";
import type { GameSlug } from "@/types/games";

/**
 * Scheduled auto check-in endpoint.
 * Called by Cloud Scheduler daily.
 *
 * Auth: Bearer token via CRON_SECRET env var.
 * Iterates all active game accounts with autoCheckin=true and performs check-ins.
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

  // Process accounts with a small delay between each to avoid rate limiting
  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    try {
      const ltokenV2 = decrypt(account.ltokenV2);
      const ltuidV2 = decrypt(account.ltuidV2);
      const result = await performCheckin(
        account.gameId as GameSlug,
        ltokenV2,
        ltuidV2
      );

      await prisma.checkInLog.create({
        data: {
          gameAccountId: account.id,
          userId: account.userId,
          gameId: account.gameId,
          status: result.status,
          reward: result.reward || null,
          errorMessage: result.success ? null : result.message,
          triggeredBy: "cron",
        },
      });

      if (result.status === "success") {
        success++;
        await prisma.gameAccount.update({
          where: { id: account.id },
          data: { lastCheckin: new Date() },
        });
      } else if (result.status === "already_claimed") {
        alreadyClaimed++;
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
      logger.error("cron checkin error", error, {
        userId: account.userId,
        gameAccountId: account.id,
        gameId: account.gameId,
      });
      await prisma.checkInLog.create({
        data: {
          gameAccountId: account.id,
          userId: account.userId,
          gameId: account.gameId,
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          triggeredBy: "cron",
        },
      });
    }

    // 1.5s delay between check-ins to avoid HoYoLAB rate limiting
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
