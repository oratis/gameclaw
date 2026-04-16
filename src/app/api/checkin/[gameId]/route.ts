import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { performCheckin } from "@/lib/hoyolab/checkin";
import { GAMES } from "@/lib/hoyolab/constants";
import type { GameSlug } from "@/types/games";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { gameId } = await params;

  if (!(gameId in GAMES)) {
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
    const ltokenV2 = decrypt(account.ltokenV2);
    const ltuidV2 = decrypt(account.ltuidV2);
    const result = await performCheckin(gameId as GameSlug, ltokenV2, ltuidV2);

    await prisma.checkInLog.create({
      data: {
        gameAccountId: account.id,
        userId: session.user.id,
        gameId,
        status: result.status,
        reward: result.reward || null,
        errorMessage: result.success ? null : result.message,
        triggeredBy: "manual",
      },
    });

    if (result.status === "success") {
      await prisma.gameAccount.update({
        where: { id: account.id },
        data: { lastCheckin: new Date() },
      });
    }

    return NextResponse.json(result);
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
