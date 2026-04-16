import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { performCheckin, getCheckinInfo } from "@/lib/hoyolab/checkin";
import { GAMES, GAME_SLUGS } from "@/lib/hoyolab/constants";
import type { GameSlug } from "@/types/games";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const gameId = searchParams.get("gameId");

  if (action === "games") {
    return NextResponse.json({
      games: GAME_SLUGS.map((slug) => ({
        slug,
        name: GAMES[slug].name,
      })),
    });
  }

  if (action === "status" && gameId) {
    if (!(gameId in GAMES)) {
      return NextResponse.json({ error: "Invalid game" }, { status: 400 });
    }

    const account = await prisma.gameAccount.findFirst({
      where: { userId: session.user.id, gameId, isActive: true },
    });

    if (!account) {
      return NextResponse.json({ error: "No linked account" }, { status: 404 });
    }

    try {
      const ltokenV2 = decrypt(account.ltokenV2);
      const ltuidV2 = decrypt(account.ltuidV2);
      const info = await getCheckinInfo(gameId as GameSlug, ltokenV2, ltuidV2);

      return NextResponse.json({
        gameId,
        uid: account.uid,
        nickname: account.nickname,
        checkinInfo: info,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to get status" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    message: "GameClaw Agent API",
    actions: ["games", "status", "checkin"],
    usage: "GET ?action=status&gameId=genshin or POST {action:'checkin',gameId:'genshin'}",
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action, gameId } = await req.json();

  if (action === "checkin") {
    if (gameId && !(gameId in GAMES)) {
      return NextResponse.json({ error: "Invalid game" }, { status: 400 });
    }

    const where: Record<string, unknown> = {
      userId: session.user.id,
      isActive: true,
    };
    if (gameId) where.gameId = gameId;

    const accounts = await prisma.gameAccount.findMany({ where });

    const settled = await Promise.allSettled(
      accounts.map(async (account) => {
        const ltokenV2 = decrypt(account.ltokenV2);
        const ltuidV2 = decrypt(account.ltuidV2);
        const result = await performCheckin(
          account.gameId as GameSlug,
          ltokenV2,
          ltuidV2
        );

        await prisma.checkInLog.create({
          data: {
            gameAccountId: account.id,
            userId: session.user.id,
            gameId: account.gameId,
            status: result.status,
            reward: result.reward || null,
            errorMessage: result.success ? null : result.message,
            triggeredBy: "skill",
          },
        });

        if (result.status === "success") {
          await prisma.gameAccount.update({
            where: { id: account.id },
            data: { lastCheckin: new Date() },
          });
        }

        return { gameId: account.gameId, uid: account.uid, ...result };
      })
    );

    const results = settled.map((s, i) => {
      if (s.status === "fulfilled") return s.value;
      return {
        gameId: accounts[i].gameId,
        uid: accounts[i].uid,
        success: false,
        status: "failed" as const,
        message: s.reason instanceof Error ? s.reason.message : "Unknown error",
      };
    });

    return NextResponse.json({ results });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
