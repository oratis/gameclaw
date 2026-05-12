/**
 * Streaming planner — same job as POST /api/plan but emits a Server-Sent
 * Events stream so the UI can render the model's progress live.
 *
 * SSE events emitted (in order):
 *   event: thinking   data: <delta text>   — incremental adaptive-thinking text
 *   event: text       data: <delta text>   — incremental JSON output text
 *   event: usage      data: {inputTokens,outputTokens,costUsd,...}
 *   event: plan       data: <Plan JSON>    — final parsed plan
 *   event: error      data: {error}        — on any failure
 *   event: done       data: {}             — stream terminator
 *
 * Quota + adapters + cost meter are identical to /api/plan.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAdapter } from "@/adapters";
import { checkQuota } from "@/lib/billing/quota";
import { PlanSchema } from "@/lib/planner/schema";
import { PLANNER_SYSTEM_PROMPT } from "@/lib/planner/system-prompt";
import { computeCostUsd } from "@/lib/planner/cost";
import { incrementPlanCall, usdToMicroDollars } from "@/lib/usage/meter";
import type { PlannerAccount } from "@/lib/planner/planner";

const PLANNER_MODEL = "claude-opus-4-7";
const MAX_PROMPT_LEN = 1000;

// Long stream — never let the route handler decide it's done early.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

function renderUserMessage(accounts: PlannerAccount[], userPrompt: string, locale?: string): string {
  const accountsBlock = accounts.length
    ? accounts
        .map((a) => {
          const head = `- ${a.slug} (${a.displayName}, vendor=${a.vendor})`;
          const caps = `  capabilities: ${a.capabilities.join(", ")}`;
          const role =
            a.uid || a.nickname
              ? `  account: uid=${a.uid ?? "?"}, nickname=${a.nickname ?? "?"}`
              : "";
          return [head, caps, role].filter(Boolean).join("\n");
        })
        .join("\n")
    : "(no accounts linked)";

  const localeLine = locale
    ? `\n\nUser's UI locale: ${locale}. Respond in their language.`
    : "";

  return `# Available accounts\n\n${accountsBlock}${localeLine}\n\n# User request\n\n${userPrompt}`;
}

function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { prompt?: unknown; locale?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "`prompt` is required" }, { status: 400 });
  }
  if (prompt.length > MAX_PROMPT_LEN) {
    return NextResponse.json(
      { error: `Prompt too long (max ${MAX_PROMPT_LEN} chars)` },
      { status: 400 }
    );
  }
  const locale = typeof body.locale === "string" ? body.locale : undefined;

  // Pre-check quota (fast 402 instead of opening an SSE then erroring).
  const quota = await checkQuota(session.user.id, "plan_call");
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: quota.reason,
        code: "quota_exceeded",
        kind: "plan_call",
        tier: quota.tier,
        used: quota.used,
        limit: quota.limit,
        upgradeUrl: "/pricing",
      },
      { status: 402 }
    );
  }

  // Build accounts payload for the planner.
  const dbAccounts = await prisma.gameAccount.findMany({
    where: { userId: session.user.id, isActive: true },
    select: { gameId: true, uid: true, nickname: true },
  });
  const accounts: PlannerAccount[] = [];
  for (const a of dbAccounts) {
    const adapter = getAdapter(a.gameId);
    if (!adapter) continue;
    accounts.push({
      slug: adapter.slug,
      displayName: adapter.displayName,
      vendor: adapter.vendor,
      capabilities: [...adapter.capabilities],
      uid: a.uid,
      nickname: a.nickname,
    });
  }

  const encoder = new TextEncoder();
  const userId = session.user.id;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(sseFrame(event, data)));

      try {
        const client = getClient();
        const messageStream = client.messages.stream({
          model: PLANNER_MODEL,
          max_tokens: 4096,
          thinking: { type: "adaptive" },
          output_config: {
            effort: "medium",
            format: zodOutputFormat(PlanSchema),
          },
          system: [
            {
              type: "text",
              text: PLANNER_SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: renderUserMessage(accounts, prompt, locale) }],
        });

        for await (const event of messageStream) {
          if (event.type === "content_block_delta") {
            const d = event.delta;
            if (d.type === "text_delta") {
              send("text", d.text);
            } else if (d.type === "thinking_delta") {
              send("thinking", d.thinking);
            }
          }
        }

        const final = await messageStream.finalMessage();

        // Reconstruct the assistant text and parse it against the schema.
        const finalText = final.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("");

        let parsed = null;
        try {
          parsed = PlanSchema.parse(JSON.parse(finalText));
        } catch (e) {
          send("error", {
            error: "Failed to parse planner output",
            detail: e instanceof Error ? e.message : String(e),
            rawText: finalText.slice(0, 500),
          });
          send("done", {});
          controller.close();
          return;
        }

        const usage = final.usage;
        const inputTokens = usage.input_tokens ?? 0;
        const outputTokens = usage.output_tokens ?? 0;
        const cacheReadInputTokens = usage.cache_read_input_tokens ?? 0;
        const cacheCreationInputTokens = usage.cache_creation_input_tokens ?? 0;
        const costUsd = computeCostUsd(PLANNER_MODEL, {
          inputTokens,
          outputTokens,
          cacheReadInputTokens,
          cacheCreationInputTokens,
        });

        // Best-effort meter; never let metering hiccup fail the stream.
        incrementPlanCall(userId, {
          tokensIn: inputTokens + cacheReadInputTokens + cacheCreationInputTokens,
          tokensOut: outputTokens,
          costUsdMicro: usdToMicroDollars(costUsd),
        }).catch(() => undefined);

        send("usage", {
          model: PLANNER_MODEL,
          inputTokens,
          outputTokens,
          cacheReadInputTokens,
          cacheCreationInputTokens,
          costUsd,
        });
        send("plan", parsed);
        send("accounts", accounts.map((a) => ({
          slug: a.slug,
          displayName: a.displayName,
          vendor: a.vendor,
        })));
        send("done", {});
      } catch (e) {
        send("error", {
          error: e instanceof Error ? e.message : "Planner request failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disable Cloud Run / proxy buffering
      "X-Accel-Buffering": "no",
    },
  });
}
