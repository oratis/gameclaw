/**
 * Public demand-collection endpoint. Pre-launch signal — what game / what
 * task / what price would users pay. Drives M3 standout-game prioritization.
 *
 * No auth required. Rate-limited at the network layer; no per-IP throttle here.
 * If userId is in the session it's attached for follow-up.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAdapter } from "@/adapters";
import { checkRateLimit, clientIp } from "@/lib/util/ratelimit";

const MAX_FIELD_LEN = 500;

function clip(s: unknown): string {
  if (typeof s !== "string") return "";
  return s.slice(0, MAX_FIELD_LEN);
}

export async function POST(req: NextRequest) {
  const session = await auth();

  // Rate-limit per-IP: 5 demands per hour per instance. Public endpoint,
  // best-effort spam dampening.
  const rl = checkRateLimit({
    key: clientIp(req.headers),
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded — try again later" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const gameTyped = clip(body.game);
  const taskDesc = clip(body.task);

  if (!gameTyped || !taskDesc) {
    return NextResponse.json(
      { error: "Both `game` and `task` are required" },
      { status: 400 }
    );
  }

  // Best-effort canonical slug match against our adapter registry.
  let gameSlug: string | null = null;
  const lowered = gameTyped.toLowerCase().replace(/\s+/g, "");
  if (hasAdapter(lowered)) {
    gameSlug = lowered;
  } else {
    // A few hand-rolled aliases.
    const aliases: Record<string, string> = {
      "原神": "genshin",
      "原神国服": "genshin-cn",
      "崩铁": "starrail",
      "星穹铁道": "starrail",
      "崩铁国服": "starrail-cn",
      "绝区零": "zzz",
      "zenless": "zzz",
      "鸣潮": "wuwa",
      "wutheringwaves": "wuwa",
      "明日方舟": "arknights",
      "arknights": "arknights",
      "ak": "arknights",
    };
    gameSlug = aliases[gameTyped.trim()] ?? aliases[lowered] ?? null;
  }

  const signal = await prisma.demandSignal.create({
    data: {
      userId: session?.user?.id ?? null,
      email: clip(body.email) || null,
      gameTyped,
      gameSlug,
      taskDesc,
      priceText: clip(body.price) || null,
      priceType: body.priceType === "monthly" ? "monthly" : body.priceType === "task" ? "task" : null,
      source: clip(body.source) || null,
    },
    select: { id: true, createdAt: true },
  });

  return NextResponse.json({
    id: signal.id,
    createdAt: signal.createdAt,
    gameSlugMatched: gameSlug,
    message: "Thanks — we'll prioritize based on what people ask for.",
  });
}
