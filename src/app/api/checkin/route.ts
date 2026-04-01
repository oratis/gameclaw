import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { performCheckin } from "@/lib/hoyolab/checkin";
import type { GameSlug } from "@/types/games";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.gameAccount.findMany({
    where: { userId: session.user.id, isActive: true },
  });

  const results = await Promise.all(
    accounts.map(async (account) => {
      try {
        const ltokenV2 = decrypt(account.ltokenV2);
        const result = await performCheckin(
          account.gameId as GameSlug,
          ltokenV2,
          account.ltuidV2
        );

        await prisma.checkInLog.create({
          data: {
            gameAccountId: account.id,
            userId: session.user.id,
            gameId: account.gameId,
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

        return {
          gameId: account.gameId,
          uid: account.uid,
          ...result,
        };
      } catch (error) {
        return {
          gameId: account.gameId,
          uid: account.uid,
          success: false,
          status: "failed",
          message: error instanceof Error ? error.message : "Unknown error",
        };
      }
    })
  );

  return NextResponse.json({ results });
}
