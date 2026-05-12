/**
 * TaskTemplate detail / delete / run.
 *
 *   GET    /api/templates/:id        → fetch
 *   DELETE /api/templates/:id        → delete (only owner)
 *   POST   /api/templates/:id/run    → execute the template synchronously
 *
 * Run iterates steps via runTask() with 1.5s spacing — quota check is
 * inherited from runTask, so a free user hitting their limit mid-template
 * gets a partial-success outcome instead of a hard failure.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const tpl = await prisma.taskTemplate.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!tpl) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ template: tpl });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const result = await prisma.taskTemplate.deleteMany({
    where: { id, userId: session.user.id },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
