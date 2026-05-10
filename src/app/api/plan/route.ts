/**
 * AI Planner — natural language → executable task plan.
 *
 * POST { prompt: string, locale?: string }
 *
 * Returns the plan inline. Does NOT execute. The caller previews the plan
 * (UI / agent) and POSTs the chosen tasks to /api/plan/execute when ready.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAdapter } from "@/adapters";
import { proposePlan } from "@/lib/planner/planner";
import type { PlannerAccount } from "@/lib/planner/planner";

const MAX_PROMPT_LEN = 1000;

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
    return NextResponse.json(
      { error: "`prompt` is required and must be non-empty" },
      { status: 400 }
    );
  }
  if (prompt.length > MAX_PROMPT_LEN) {
    return NextResponse.json(
      { error: `Prompt too long (max ${MAX_PROMPT_LEN} chars)` },
      { status: 400 }
    );
  }

  const locale = typeof body.locale === "string" ? body.locale : undefined;

  const dbAccounts = await prisma.gameAccount.findMany({
    where: { userId: session.user.id, isActive: true },
    select: {
      gameId: true,
      uid: true,
      nickname: true,
    },
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

  try {
    const outcome = await proposePlan({ prompt, accounts, locale });
    return NextResponse.json({
      plan: outcome.plan,
      usage: outcome.usage,
      // Echo accounts so the UI can match the plan's gameSlug back to a friendly name without another fetch.
      accounts: accounts.map((a) => ({
        slug: a.slug,
        displayName: a.displayName,
        vendor: a.vendor,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Planner request failed",
      },
      { status: 500 }
    );
  }
}
