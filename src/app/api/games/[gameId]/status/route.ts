import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildCreds } from "@/lib/credentials";
import { getAdapter, hasAdapter } from "@/adapters";

export async function GET(
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
    const result = await adapter.execute({ capability: "checkin_info" }, creds);

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
      {
        error: error instanceof Error ? error.message : "Failed to get status",
      },
      { status: 500 }
    );
  }
}
