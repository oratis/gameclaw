import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runTask } from "@/lib/tasks/runner";
import { randomUUID } from "node:crypto";
import { L3NotEntitledError, QuotaExceededError } from "@/lib/billing/quota";
import type { Capability } from "@/adapters/types";

const SPACING_MS = 1500;

interface Step {
  gameSlug: string;
  capability: string;
  params?: Record<string, unknown>;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const tpl = await prisma.taskTemplate.findFirst({
    where: { id, userId: session.user.id, isActive: true },
  });
  if (!tpl) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const steps = (tpl.steps as unknown as Step[]) ?? [];
  if (steps.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const templateRunId = randomUUID();

  type Outcome = {
    gameSlug: string;
    capability: string;
    taskId?: string;
    status: string;
    message: string;
    reward?: string;
    code?: string;
  };
  const results: Outcome[] = [];

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    try {
      const { taskId, result } = await runTask({
        userId: session.user.id,
        gameSlug: s.gameSlug,
        capability: s.capability as Capability,
        params: s.params,
        triggeredBy: "template",
        templateRunId,
        templateStepIdx: i,
      });
      results.push({
        gameSlug: s.gameSlug,
        capability: s.capability,
        taskId,
        status: result.status,
        message: result.message,
        reward: result.reward,
      });
    } catch (e) {
      if (e instanceof QuotaExceededError) {
        results.push({
          gameSlug: s.gameSlug,
          capability: s.capability,
          status: "failed",
          code: e.code,
          message: e.message,
        });
        // Stop after the first quota deny — every remaining task would hit the same wall.
        for (let j = i + 1; j < steps.length; j++) {
          results.push({
            gameSlug: steps[j].gameSlug,
            capability: steps[j].capability,
            status: "skipped",
            message: "Skipped — earlier quota deny",
          });
        }
        break;
      }
      if (e instanceof L3NotEntitledError) {
        results.push({
          gameSlug: s.gameSlug,
          capability: s.capability,
          status: "failed",
          code: e.code,
          message: e.message,
        });
      } else {
        results.push({
          gameSlug: s.gameSlug,
          capability: s.capability,
          status: "failed",
          message: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }
    if (i < steps.length - 1) {
      await new Promise((r) => setTimeout(r, SPACING_MS));
    }
  }

  return NextResponse.json({ templateRunId, results });
}
