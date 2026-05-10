import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildCreds } from "@/lib/credentials";
import { getAdapter } from "@/adapters";

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
        const adapter = getAdapter(account.gameId);
        if (!adapter) {
          return {
            gameId: account.gameId,
            uid: account.uid,
            success: false,
            status: "failed",
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
          success,
          status: dbStatus,
          message: result.message,
          reward: result.reward,
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
