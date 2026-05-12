/**
 * TaskTemplate CRUD — user's saved "daily routines".
 *
 * Each template is an ordered list of (gameSlug, capability, params?) steps
 * and an optional cron expression. The runtime materializes it into a
 * sequence of runTask() calls; the planner can also pre-fill a template from
 * its own plan output (see POST /api/templates with planTasks=...).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAdapter } from "@/adapters";
import { CAPABILITIES } from "@/lib/planner/schema";
import { Prisma } from "@prisma/client";

const CAPABILITY_SET = new Set<string>(CAPABILITIES);
const MAX_STEPS = 30;
const MAX_NAME_LEN = 80;

interface StepInput {
  gameSlug: string;
  capability: string;
  params?: Record<string, unknown>;
  rationale?: string;
}

function validateSteps(raw: unknown): { ok: true; steps: StepInput[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) {
    return { ok: false, error: "`steps` must be an array" };
  }
  if (raw.length === 0) {
    return { ok: false, error: "Template must have at least one step" };
  }
  if (raw.length > MAX_STEPS) {
    return { ok: false, error: `Too many steps (max ${MAX_STEPS})` };
  }
  const steps: StepInput[] = [];
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i] as Record<string, unknown> | null;
    if (!r || typeof r !== "object") {
      return { ok: false, error: `step ${i + 1} must be an object` };
    }
    const gameSlug = typeof r.gameSlug === "string" ? r.gameSlug : "";
    const capability = typeof r.capability === "string" ? r.capability : "";
    if (!hasAdapter(gameSlug)) {
      return { ok: false, error: `step ${i + 1}: unknown gameSlug ${gameSlug}` };
    }
    if (!CAPABILITY_SET.has(capability)) {
      return { ok: false, error: `step ${i + 1}: unknown capability ${capability}` };
    }
    const params =
      r.params && typeof r.params === "object"
        ? (r.params as Record<string, unknown>)
        : undefined;
    const rationale = typeof r.rationale === "string" ? r.rationale : undefined;
    steps.push({ gameSlug, capability, params, rationale });
  }
  return { ok: true, steps };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows = await prisma.taskTemplate.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      schedule: true,
      steps: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return NextResponse.json({ templates: rows });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = (typeof body.name === "string" ? body.name : "").trim();
  if (!name) {
    return NextResponse.json({ error: "`name` is required" }, { status: 400 });
  }
  if (name.length > MAX_NAME_LEN) {
    return NextResponse.json(
      { error: `name too long (max ${MAX_NAME_LEN} chars)` },
      { status: 400 }
    );
  }

  const v = validateSteps(body.steps);
  if (!v.ok) {
    return NextResponse.json({ error: v.error }, { status: 400 });
  }

  const schedule = typeof body.schedule === "string" ? body.schedule : null;

  const tpl = await prisma.taskTemplate.create({
    data: {
      userId: session.user.id,
      name,
      schedule,
      steps: v.steps as unknown as Prisma.InputJsonValue,
      isActive: true,
    },
    select: { id: true, name: true, createdAt: true },
  });

  return NextResponse.json({ template: tpl });
}
