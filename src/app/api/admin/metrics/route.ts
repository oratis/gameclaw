/**
 * Admin metrics — high-level system state for the admin dashboard.
 *
 * GET: returns user/account/task/plan counts, per-adapter failure rates,
 * recent demand signals.
 *
 * Auth: requireAdmin() — env ADMIN_EMAILS or user.role==='admin'.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth_helpers/admin";

const DAYS_WINDOW = 7;

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: gate.reason === "unauthorized" ? 401 : 403 });
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() - DAYS_WINDOW * 24 * 60 * 60 * 1000);

  const [
    userCount,
    accountCount,
    taskCount,
    subscriptionCount,
    demandCount,
    paidSubs,
    tasksWindow,
    recentDemand,
    perAdapterStats,
    circuitStates,
    workerJobs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.gameAccount.count({ where: { isActive: true } }),
    prisma.task.count(),
    prisma.subscription.count({ where: { status: "active" } }),
    prisma.demandSignal.count(),
    prisma.subscription.count({
      where: { status: "active", tier: { in: ["pro", "proplus", "enterprise"] } },
    }),
    prisma.task.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { gameSlug: true, status: true, capability: true },
    }),
    prisma.demandSignal.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        gameTyped: true,
        gameSlug: true,
        taskDesc: true,
        priceText: true,
        priceType: true,
        email: true,
        createdAt: true,
      },
    }),
    prisma.task.groupBy({
      by: ["gameSlug", "status"],
      _count: { _all: true },
      where: { createdAt: { gte: windowStart } },
    }),
    prisma.riskCircuitState.findMany({
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.workerJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        taskId: true,
        pool: true,
        executionState: true,
        startedAt: true,
        completedAt: true,
        errorMessage: true,
      },
    }),
  ]);

  // Compute per-adapter rollup
  type AdapterRollup = {
    slug: string;
    total: number;
    success: number;
    alreadyDone: number;
    failed: number;
    failureRate: number;
  };
  const adapterRollup = new Map<string, AdapterRollup>();
  for (const t of tasksWindow) {
    let r = adapterRollup.get(t.gameSlug);
    if (!r) {
      r = { slug: t.gameSlug, total: 0, success: 0, alreadyDone: 0, failed: 0, failureRate: 0 };
      adapterRollup.set(t.gameSlug, r);
    }
    r.total++;
    if (t.status === "success") r.success++;
    else if (t.status === "already_done" || t.status === "already_claimed") r.alreadyDone++;
    else if (t.status === "failed") r.failed++;
  }
  for (const r of adapterRollup.values()) {
    r.failureRate = r.total > 0 ? r.failed / r.total : 0;
  }
  const adapterStats = [...adapterRollup.values()].sort((a, b) => b.total - a.total);

  // Compute capability popularity
  const capCounts = new Map<string, number>();
  for (const t of tasksWindow) {
    capCounts.set(t.capability, (capCounts.get(t.capability) ?? 0) + 1);
  }
  const capabilityStats = [...capCounts.entries()]
    .map(([capability, count]) => ({ capability, count }))
    .sort((a, b) => b.count - a.count);

  // Top demanded games (from DemandSignal)
  const demandGameCounts = new Map<string, number>();
  for (const d of recentDemand) {
    const key = d.gameSlug ?? d.gameTyped.toLowerCase();
    demandGameCounts.set(key, (demandGameCounts.get(key) ?? 0) + 1);
  }
  const topDemandedGames = [...demandGameCounts.entries()]
    .map(([game, count]) => ({ game, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return NextResponse.json({
    summary: {
      windowDays: DAYS_WINDOW,
      userCount,
      activeAccountCount: accountCount,
      activeSubscriptionCount: subscriptionCount,
      paidSubscriptionCount: paidSubs,
      taskCount,
      demandCount,
      tasksInWindow: tasksWindow.length,
    },
    adapterStats,
    capabilityStats,
    topDemandedGames,
    recentDemand,
    perAdapterStatsRaw: perAdapterStats,
    circuitStates,
    workerJobs,
  });
}
