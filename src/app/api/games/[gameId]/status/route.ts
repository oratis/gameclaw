import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { getCheckinInfo } from "@/lib/hoyolab/checkin";
import { GAMES } from "@/lib/hoyolab/constants";
import type { GameSlug } from "@/types/games";

export async function GET(
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

  const ltokenV2 = decrypt(account.ltokenV2);
  const info = await getCheckinInfo(gameId as GameSlug, ltokenV2, account.ltuidV2);

  return NextResponse.json({
    gameId,
    uid: account.uid,
    nickname: account.nickname,
    checkinInfo: info,
  });
}
