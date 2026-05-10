/**
 * Risk circuit breaker.
 *
 * Computes rolling failure rate per scope (e.g. "adapter:wuwa") from recent
 * Task rows. If the rate exceeds the threshold, opens the circuit and stops
 * dispatching to that scope. Auto-heals after a cooldown.
 *
 * Called:
 *   - On every L3 dispatch (refuses if open)
 *   - After every task completion (recomputes rate, may open or close)
 *
 * Tunables:
 *   WINDOW_MIN          — rolling window length
 *   MIN_SAMPLES         — don't open circuit until we have N completed tasks in the window
 *   OPEN_THRESHOLD      — failure rate (0..1) at which to open
 *   CLOSE_THRESHOLD     — failure rate (0..1) at which auto-close
 *   COOLDOWN_MIN        — minimum time circuit stays open even if rate drops
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const WINDOW_MIN = 60;
const MIN_SAMPLES = 5;
const OPEN_THRESHOLD = 0.4; // 40%+ failure → open
const CLOSE_THRESHOLD = 0.2; // ≤20% failure → close
const COOLDOWN_MIN = 30;

export interface CircuitState {
  scope: string;
  state: "closed" | "open";
  failureRate: number;
  windowStart: Date;
  windowEnd: Date;
}

export async function checkCircuit(scope: string): Promise<CircuitState> {
  const now = new Date();
  const row = await prisma.riskCircuitState.findUnique({
    where: { scope },
  });

  if (!row) {
    return {
      scope,
      state: "closed",
      failureRate: 0,
      windowStart: now,
      windowEnd: now,
    };
  }

  // If open and cooldown elapsed, treat as closed (the next update will write it).
  if (row.state === "open" && row.resumesAt && row.resumesAt <= now) {
    return {
      scope,
      state: "closed",
      failureRate: row.failureRate,
      windowStart: row.windowStart ?? now,
      windowEnd: row.windowEnd ?? now,
    };
  }

  return {
    scope,
    state: row.state === "open" ? "open" : "closed",
    failureRate: row.failureRate,
    windowStart: row.windowStart ?? now,
    windowEnd: row.windowEnd ?? now,
  };
}

/**
 * Recompute the failure rate for a scope from the rolling window of Task
 * rows and update RiskCircuitState. Idempotent — safe to call after every
 * task completion.
 *
 * scope must be derivable from the task: typical mapping is
 * `adapter:${gameSlug}` (since each gameSlug has one adapter).
 */
export async function updateCircuitForScope(scope: string): Promise<CircuitState> {
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - WINDOW_MIN * 60_000);

  // gameSlug from "adapter:wuwa" → "wuwa"
  const slug = scope.startsWith("adapter:") ? scope.slice("adapter:".length) : null;
  if (!slug) {
    // Other scope types (vendor-wide etc.) not yet implemented.
    return { scope, state: "closed", failureRate: 0, windowStart, windowEnd };
  }

  const counts = await prisma.task.groupBy({
    by: ["status"],
    where: {
      gameSlug: slug,
      finishedAt: { gte: windowStart, lte: windowEnd },
      status: { in: ["success", "already_done", "failed"] },
    },
    _count: { _all: true },
  });

  const stats = counts.reduce(
    (acc, c) => {
      acc.total += c._count._all;
      if (c.status === "failed") acc.failed = c._count._all;
      return acc;
    },
    { total: 0, failed: 0 }
  );

  const failureRate = stats.total > 0 ? stats.failed / stats.total : 0;

  // Decide state transition
  const existing = await prisma.riskCircuitState.findUnique({ where: { scope } });
  const nowOpen = existing?.state === "open";
  let newState: "open" | "closed" = nowOpen ? "open" : "closed";
  let resumesAt: Date | null = existing?.resumesAt ?? null;
  let triggeredBy: string | null = existing?.triggeredBy ?? null;

  if (!nowOpen && stats.total >= MIN_SAMPLES && failureRate >= OPEN_THRESHOLD) {
    newState = "open";
    resumesAt = new Date(windowEnd.getTime() + COOLDOWN_MIN * 60_000);
    triggeredBy = `auto: rate=${(failureRate * 100).toFixed(1)}%, samples=${stats.total}`;
    logger.warn("circuit opened", { scope, failureRate, samples: stats.total });
  } else if (nowOpen && (stats.total === 0 || failureRate <= CLOSE_THRESHOLD)) {
    if (existing?.resumesAt && windowEnd >= existing.resumesAt) {
      newState = "closed";
      resumesAt = null;
      triggeredBy = null;
      logger.info("circuit closed", { scope, failureRate });
    }
  }

  await prisma.riskCircuitState.upsert({
    where: { scope },
    create: {
      scope,
      state: newState,
      failureRate,
      windowStart,
      windowEnd,
      resumesAt,
      triggeredBy,
    },
    update: {
      state: newState,
      failureRate,
      windowStart,
      windowEnd,
      resumesAt,
      triggeredBy,
    },
  });

  return { scope, state: newState, failureRate, windowStart, windowEnd };
}
