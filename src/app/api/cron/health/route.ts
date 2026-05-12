/**
 * Daily account-health cron. Scans each active GameAccount's recent Task
 * history; when it shows a credential-expiry / auth-failure pattern, marks
 * `needsRelink = true` so the dashboard shows a banner and we can stop
 * burning quota on failing accounts.
 *
 * Auth: Bearer CRON_SECRET (same as /api/cron/checkin).
 *
 * Body: none. Schedule via Cloud Scheduler daily (e.g. 0 7 * * * Asia/Shanghai,
 * 6 hours after the checkin cron so we sample fresh data).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { notifyAdmins } from "@/lib/notify/notify";

const WINDOW_DAYS = 7;
const MIN_SAMPLES = 3;
const FAIL_RATE_OPEN = 0.6;
const AUTH_ERROR_REGEX =
  /(invalid|expired|token\s*expired|cookies?|relink|220|1002|-100\b|login)/i;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const windowStart = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // Pull every active account with at least one recent task.
  const accounts = await prisma.gameAccount.findMany({
    where: { isActive: true },
    select: { id: true, userId: true, gameId: true, uid: true, needsRelink: true },
  });

  let flagged = 0;
  let cleared = 0;
  const flaggedNotes: string[] = [];

  for (const a of accounts) {
    const recent = await prisma.task.findMany({
      where: { gameAccountId: a.id, createdAt: { gte: windowStart } },
      select: { status: true, errorMessage: true },
    });
    if (recent.length < MIN_SAMPLES) {
      // Not enough data; if currently flagged AND no recent activity, leave alone.
      continue;
    }

    const fails = recent.filter((r) => r.status === "failed");
    const authFails = fails.filter(
      (r) => r.errorMessage && AUTH_ERROR_REGEX.test(r.errorMessage)
    );
    const failRate = fails.length / recent.length;
    const authFailRate = authFails.length / recent.length;

    // Heuristic: at least MIN_SAMPLES tasks, and either:
    //  - overall failure rate ≥ 60% (vendor totally broken), OR
    //  - auth-error rate ≥ 40% (clear credential expiry)
    const shouldFlag =
      failRate >= FAIL_RATE_OPEN || authFailRate >= 0.4;

    if (shouldFlag && !a.needsRelink) {
      await prisma.gameAccount.update({
        where: { id: a.id },
        data: { needsRelink: true },
      });
      flagged++;
      flaggedNotes.push(`${a.gameId} uid=${a.uid} user=${a.userId} authFail=${authFails.length}/${recent.length}`);
    } else if (!shouldFlag && a.needsRelink) {
      await prisma.gameAccount.update({
        where: { id: a.id },
        data: { needsRelink: false },
      });
      cleared++;
    }
  }

  const summary = {
    accountsScanned: accounts.length,
    newlyFlagged: flagged,
    cleared,
    durationMs: Date.now() - startedAt,
  };

  logger.info("cron health finished", summary);

  // Best-effort admin notification when there's any churn.
  if (flagged > 0 || cleared > 0) {
    notifyAdmins({
      title: `GameClaw health: ${flagged} flagged · ${cleared} cleared`,
      severity: flagged > 0 ? "warning" : "info",
      body: [
        `Account-health cron ran across **${accounts.length}** active accounts.`,
        `**Newly flagged** as needing re-link: ${flagged}`,
        flagged > 0 ? flaggedNotes.slice(0, 10).map((n) => `- ${n}`).join("\n") : "",
        `**Auto-cleared** (re-linked or activity recovered): ${cleared}`,
      ]
        .filter(Boolean)
        .join("\n"),
      url: "https://gogameclaw.com/admin",
    }).catch(() => undefined);
  }

  return NextResponse.json(summary);
}
