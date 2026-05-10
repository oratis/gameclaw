import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildCreds } from "@/lib/credentials";
import { getAdapter, hasAdapter, listAdapters } from "@/adapters";

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
      games: listAdapters().map((a) => ({
        slug: a.slug,
        name: a.displayName,
        vendor: a.vendor,
        capabilities: a.capabilities,
      })),
    });
  }

  if (action === "status" && gameId) {
    if (!hasAdapter(gameId)) {
      return NextResponse.json({ error: "Invalid game" }, { status: 400 });
    }

    const account = await prisma.gameAccount.findFirst({
      where: { userId: session.user.id, gameId, isActive: true },
    });

    if (!account) {
      return NextResponse.json({ error: "No linked account" }, { status: 404 });
    }

    try {
      const adapter = getAdapter(gameId)!;
      const creds = buildCreds(account);
      const result = await adapter.execute(
        { capability: "checkin_info" },
        creds
      );

      return NextResponse.json({
        gameId,
        uid: account.uid,
        nickname: account.nickname,
        checkinInfo: result.data ?? null,
        status: result.status,
        message: result.message,
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
    if (gameId && !hasAdapter(gameId)) {
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
        const adapter = getAdapter(account.gameId);
        if (!adapter) {
          return {
            gameId: account.gameId,
            uid: account.uid,
            success: false,
            status: "failed" as const,
            message: `No adapter registered for game: ${account.gameId}`,
          };
        }

        const creds = buildCreds(account);
        const result = await adapter.execute(
          { capability: "checkin" },
          creds
        );

        const success = result.status === "success" || result.status === "already_done";
        const dbStatus = result.status === "already_done" ? "already_claimed" : result.status;

        await prisma.checkInLog.create({
          data: {
            gameAccountId: account.id,
            userId: session.user.id,
            gameId: account.gameId,
            status: dbStatus,
            reward: result.reward || null,
            errorMessage: success ? null : result.message,
            triggeredBy: "skill",
          },
        });

        if (result.status === "success") {
          await prisma.gameAccount.update({
            where: { id: account.id },
            data: { lastCheckin: new Date() },
          });
        }

        return {
          gameId: account.gameId,
          uid: account.uid,
          success,
          status: dbStatus,
          message: result.message,
          reward: result.reward,
        };
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
