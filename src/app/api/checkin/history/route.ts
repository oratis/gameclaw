import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const gameId = searchParams.get("gameId");
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const where: Record<string, unknown> = { userId: session.user.id };
  if (gameId) where.gameId = gameId;

  const logs = await prisma.checkInLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
    skip: offset,
    select: {
      id: true,
      gameId: true,
      status: true,
      reward: true,
      triggeredBy: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ logs });
}
