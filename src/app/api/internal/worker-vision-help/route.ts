/**
 * Worker vision-help — when an L3 worker's MAA / template-matching gets
 * stuck, it posts a screenshot here with a question; we call Claude vision
 * and return a UI action recommendation.
 *
 * Auth: same one-time callbackToken pattern as worker-callback / worker-creds.
 *
 * Body:
 *   {
 *     taskId, callbackToken,
 *     screenshotUrl: string,
 *     question: string,         // "what should the next action be?"
 *     allowedActions?: string[] // e.g. ["click", "swipe", "back", "wait", "abort"]
 *   }
 *
 * Response:
 *   {
 *     action: "click" | "swipe" | "back" | "wait" | "abort" | "tap_text",
 *     target?: { x: number, y: number } | { text: string },
 *     reasoning: string,
 *     confidence: "low" | "medium" | "high"
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { constantTimeEqualHex } from "@/lib/l3/auth";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const MODEL = "claude-sonnet-4-6";

const AdviceSchema = z.object({
  action: z.enum(["click", "swipe", "back", "wait", "abort", "tap_text"]),
  reasoning: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  targetCoord: z
    .object({
      x: z.number().int(),
      y: z.number().int(),
    })
    .optional(),
  targetText: z.string().optional(),
});

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

const SYSTEM = `You are GameClaw's L3 Worker Vision Assistant. A Cloud worker
running an Android automation tool is stuck and showing you a screenshot of
the current game state. Your job is to recommend ONE next UI action.

Rules:
- Be conservative. When in doubt, recommend "wait" or "abort".
- If you can clearly identify a button to tap, prefer "tap_text" with the
  button label over "click" with raw coordinates.
- If the screen shows an error dialog, a crash, or content unrelated to the
  task, recommend "abort".
- If the screen is loading, recommend "wait".
- Use the structured schema for output.`;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const taskId = typeof body.taskId === "string" ? body.taskId : "";
  const token = typeof body.callbackToken === "string" ? body.callbackToken : "";
  const screenshotUrl =
    typeof body.screenshotUrl === "string" ? body.screenshotUrl : "";
  const question =
    typeof body.question === "string" ? body.question : "What should I do next?";

  if (!taskId || !token || !screenshotUrl) {
    return NextResponse.json(
      { error: "taskId, callbackToken, screenshotUrl are required" },
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
    logger.warn("worker-vision-help bad token", { taskId });
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
  if (job.callbackUsed) {
    return NextResponse.json(
      { error: "Token already used (terminal callback)" },
      { status: 409 }
    );
  }

  const client = getClient();
  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 512,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "low",
        format: zodOutputFormat(AdviceSchema),
      },
      system: [{ type: "text", text: SYSTEM }],
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: question },
            { type: "image", source: { type: "url", url: screenshotUrl } },
          ],
        },
      ],
    });

    if (!response.parsed_output) {
      return NextResponse.json(
        { error: "Vision LLM returned unparseable output" },
        { status: 502 }
      );
    }

    return NextResponse.json(response.parsed_output);
  } catch (e) {
    logger.error("worker-vision-help failed", e, { taskId });
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Vision call failed" },
      { status: 500 }
    );
  }
}
