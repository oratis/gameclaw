import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildCreds } from "@/lib/credentials";
import { getAdapter, hasAdapter } from "@/adapters";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { gameId } = await params;

  if (!hasAdapter(gameId)) {
    return NextResponse.json({ error: "Invalid game" }, { status: 400 });
  }

  const account = await prisma.gameAccount.findFirst({
    where: { userId: session.user.id, gameId, isActive: true },
  });

  if (!account) {
    return NextResponse.json(
      { error: "No linked account for this game" },
      { status: 404 }
    );
  }

  try {
    const adapter = getAdapter(gameId)!;
    const creds = buildCreds(account);
    const result = await adapter.execute({ capability: "checkin" }, creds);

    const success = result.status === "success" || result.status === "already_done";
    const dbStatus = result.status === "already_done" ? "already_claimed" : result.status;

    await prisma.checkInLog.create({
      data: {
        gameAccountId: account.id,
        userId: session.user.id,
        gameId,
        status: dbStatus,
        reward: result.reward || null,
        errorMessage: success ? null : result.message,
        triggeredBy: "manual",
      },
    });

    if (result.status === "success") {
      await prisma.gameAccount.update({
        where: { id: account.id },
        data: { lastCheckin: new Date() },
      });
    }

    return NextResponse.json({
      success,
      status: dbStatus,
      message: result.message,
      reward: result.reward,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        status: "failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
