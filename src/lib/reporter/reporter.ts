/**
 * AI Reporter — synthesizes a friendly weekly digest of what the user's
 * GameClaw account did. Reads Task + UsageMeter rows for the requested
 * window, asks Claude Haiku 4.5 to summarize, returns a Markdown string.
 *
 * Haiku 4.5 (not Opus) because: summary task is well-structured, fits Haiku
 * comfortably, and we want this to be cheap enough to run weekly per user.
 */

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { computeCostUsd } from "@/lib/planner/cost";

const MODEL = "claude-haiku-4-5";

export interface ReportWindow {
  start: Date;
  end: Date;
}

export function lastNDaysWindow(days: number): ReportWindow {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60_000);
  return { start, end };
}

export interface ReporterOutcome {
  markdown: string;
  usage: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  };
}

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

const SYSTEM = `You are GameClaw's weekly reporter. You convert a dump of
the user's automation activity into a short, warm digest in their language
(default English; switch to Chinese / Japanese / Korean if the request asks
for it). Open with one summary sentence, then list per-game results in a
brief bulleted form, then close with a one-line callout for anything
notable (a failure pattern, a credential about to expire, a quota close to
its limit). Keep it under ~250 words. Use markdown. No code blocks.`;

interface PerGameStat {
  gameSlug: string;
  total: number;
  success: number;
  alreadyClaimed: number;
  failed: number;
  topErrorMessage?: string;
}

async function gatherStats(
  userId: string,
  window: ReportWindow
): Promise<{ perGame: PerGameStat[]; planCalls: number; tasksTotal: number }> {
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      createdAt: { gte: window.start, lte: window.end },
    },
    select: { gameSlug: true, status: true, errorMessage: true, capability: true },
  });

  const byGame = new Map<string, PerGameStat>();
  for (const t of tasks) {
    const key = t.gameSlug;
    if (!byGame.has(key)) {
      byGame.set(key, {
        gameSlug: key,
        total: 0,
        success: 0,
        alreadyClaimed: 0,
        failed: 0,
      });
    }
    const s = byGame.get(key)!;
    s.total++;
    if (t.status === "success") s.success++;
    else if (t.status === "already_done" || t.status === "already_claimed") s.alreadyClaimed++;
    else if (t.status === "failed") {
      s.failed++;
      if (!s.topErrorMessage && t.errorMessage) s.topErrorMessage = t.errorMessage;
    }
  }

  const meters = await prisma.usageMeter.findMany({
    where: {
      userId,
      createdAt: { gte: window.start, lte: window.end },
    },
    select: { planCallCount: true },
  });
  const planCalls = meters.reduce((acc, m) => acc + m.planCallCount, 0);

  return {
    perGame: [...byGame.values()].sort((a, b) => b.total - a.total),
    planCalls,
    tasksTotal: tasks.length,
  };
}

export async function generateReport(
  userId: string,
  window: ReportWindow,
  locale?: string
): Promise<ReporterOutcome> {
  const stats = await gatherStats(userId, window);

  if (stats.tasksTotal === 0) {
    return {
      markdown: `Nothing to report — no tasks were run between ${window.start.toISOString().slice(0, 10)} and ${window.end.toISOString().slice(0, 10)}.`,
      usage: { model: "(skipped)", inputTokens: 0, outputTokens: 0, costUsd: 0 },
    };
  }

  const localeLine = locale
    ? `\n\nUser locale: ${locale}. Respond in their language.`
    : "";

  const userText = `Window: ${window.start.toISOString()} to ${window.end.toISOString()}.
Tasks total: ${stats.tasksTotal}
AI Planner calls: ${stats.planCalls}

Per-game breakdown:
${stats.perGame
  .map(
    (g) =>
      `- ${g.gameSlug}: total=${g.total}, success=${g.success}, already_done=${g.alreadyClaimed}, failed=${g.failed}${g.topErrorMessage ? `, top_error="${g.topErrorMessage.slice(0, 100)}"` : ""}`
  )
  .join("\n")}${localeLine}

Synthesize the digest now.`;

  const client = getClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [
      { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: userText }],
  });

  const markdown = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  const inputTokens = response.usage.input_tokens ?? 0;
  const outputTokens = response.usage.output_tokens ?? 0;
  const costUsd = computeCostUsd(MODEL, {
    inputTokens,
    outputTokens,
    cacheReadInputTokens: response.usage.cache_read_input_tokens ?? 0,
    cacheCreationInputTokens: response.usage.cache_creation_input_tokens ?? 0,
  });

  return {
    markdown,
    usage: { model: MODEL, inputTokens, outputTokens, costUsd },
  };
}
