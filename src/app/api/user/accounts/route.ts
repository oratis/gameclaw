import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { validateCookies } from "@/lib/hoyolab/account";
import { getGameAccounts } from "@/lib/hoyolab/account";
import { GAMES } from "@/lib/hoyolab/constants";
import type { GameSlug } from "@/types/games";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.gameAccount.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      gameId: true,
      uid: true,
      nickname: true,
      server: true,
      autoCheckin: true,
      isActive: true,
      lastCheckin: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ accounts });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { gameId, ltokenV2, ltuidV2 } = await req.json();

  if (!gameId || !ltokenV2 || !ltuidV2) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!(gameId in GAMES)) {
    return NextResponse.json({ error: "Invalid game" }, { status: 400 });
  }

  const valid = await validateCookies(ltokenV2, ltuidV2);
  if (!valid) {
    return NextResponse.json({ error: "Invalid cookies" }, { status: 400 });
  }

  const roles = await getGameAccounts(ltokenV2, ltuidV2);
  const gameConfig = GAMES[gameId as GameSlug];
  const role = roles.find((r) => r.game_biz.includes(gameConfig.gameId));

  const account = await prisma.gameAccount.create({
    data: {
      userId: session.user.id,
      gameId,
      uid: role?.game_uid || ltuidV2,
      nickname: role?.nickname || null,
      server: role?.region || null,
      ltokenV2: encrypt(ltokenV2),
      ltuidV2: ltuidV2,
    },
    select: {
      id: true,
      gameId: true,
      uid: true,
      nickname: true,
    },
  });

  return NextResponse.json({ account });
}
