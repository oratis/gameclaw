/**
 * AI Verifier — uses Claude vision to confirm an L3 task actually accomplished
 * its goal, given the screenshots the worker uploaded.
 *
 * Called from the worker-callback endpoint after a worker reports success.
 * Returns a verdict the calling code can use to flip a "succeeded" Task into
 * "failed" if the screenshots disagree with the worker's self-report.
 *
 * Cost-aware: uses Claude Sonnet 4.6 (cheaper than Opus, vision-capable),
 * effort=medium, max 2 screenshots per call (last screenshot + a midpoint).
 */

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const MODEL = "claude-sonnet-4-6";

const VerdictSchema = z.object({
  goalAccomplished: z
    .boolean()
    .describe("True if the screenshots clearly show the task's goal achieved."),
  confidence: z.enum(["low", "medium", "high"]),
  observation: z
    .string()
    .describe("One short sentence describing what the screenshots show."),
  recommendation: z
    .enum(["accept", "reject", "manual_review"])
    .describe(
      "accept = let the success stand. reject = flip Task to failed. manual_review = surface to admin queue."
    ),
});

export type VerifierVerdict = z.infer<typeof VerdictSchema>;

export interface VerifyInput {
  /** Capability the worker claimed to execute, e.g. "weekly_dungeon" */
  capability: string;
  /** Adapter slug, e.g. "arknights" */
  gameSlug: string;
  /** Up to 2 GCS image URLs the worker uploaded — used as Claude vision inputs */
  screenshotUrls: string[];
  /** Optional summary text from the worker */
  workerMessage?: string;
}

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

const SYSTEM = `You are GameClaw's L3 Verifier. You inspect screenshots from completed
in-game automation tasks and decide whether the task's goal was actually
achieved. Be skeptical — workers can self-report success while their
screenshot shows a stuck loading screen, error dialog, or unrelated state.

Output the verdict via the structured schema. Bias toward "manual_review"
when uncertain; bias toward "reject" only when you can clearly see the goal
wasn't met (an error dialog, the wrong scene, etc.).`;

function renderUserMessage(input: VerifyInput): Anthropic.MessageParam {
  const intro = `Capability: ${input.capability}
Game: ${input.gameSlug}
Worker's self-report: ${input.workerMessage ?? "(none)"}

Inspect the attached screenshot(s). Did the task actually accomplish its goal?`;

  const content: Anthropic.ContentBlockParam[] = [{ type: "text", text: intro }];
  for (const url of input.screenshotUrls.slice(0, 2)) {
    content.push({
      type: "image",
      source: { type: "url", url },
    });
  }
  return { role: "user", content };
}

export async function verifyL3Task(
  input: VerifyInput
): Promise<VerifierVerdict | null> {
  if (!input.screenshotUrls.length) return null;
  const client = getClient();

  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "medium",
        format: zodOutputFormat(VerdictSchema),
      },
      system: [{ type: "text", text: SYSTEM }],
      messages: [renderUserMessage(input)],
    });
    return response.parsed_output ?? null;
  } catch {
    return null;
  }
}
