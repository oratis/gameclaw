import { KuroClient } from "./client";
import { KURO_GAMES, type KuroGameSlug } from "./constants";
import type { KuroRole, KuroSignRecordItem } from "./types";
import type { CheckInResult } from "@/types/games";

export async function getKuroRoles(
  token: string,
  gameSlug: KuroGameSlug
): Promise<KuroRole[]> {
  const game = KURO_GAMES[gameSlug];
  const client = new KuroClient(token);
  const res = await client.post<KuroRole[]>("/gamer/role/list", {
    gameId: game.gameId,
  });
  if (res.code === 200 && Array.isArray(res.data)) return res.data;
  return [];
}

function reqMonthMM(): string {
  return String(new Date().getMonth() + 1).padStart(2, "0");
}

export async function performKuroCheckin(
  token: string,
  gameSlug: KuroGameSlug,
  role: KuroRole
): Promise<CheckInResult> {
  const game = KURO_GAMES[gameSlug];
  const client = new KuroClient(token);

  const res = await client.post("/encourage/signIn/v2", {
    gameId: role.gameId,
    serverId: role.serverId,
    roleId: role.roleId,
    userId: role.userId,
    reqMonth: reqMonthMM(),
  });

  if (res.code === 200) {
    let reward: string | undefined;
    try {
      const rec = await client.post<KuroSignRecordItem[]>(
        "/encourage/signIn/queryRecordV2",
        {
          gameId: role.gameId,
          serverId: role.serverId,
          roleId: role.roleId,
          userId: role.userId,
        }
      );
      if (rec.code === 200 && Array.isArray(rec.data) && rec.data.length > 0) {
        reward = rec.data[0].goodsName;
      }
    } catch {
      // Ignore record-fetch failures; sign-in itself succeeded.
    }
    return {
      success: true,
      status: "success",
      message: `Successfully checked in for ${game.name}`,
      reward,
    };
  }

  // Already-signed messages from Kuro vary; match common patterns.
  if (res.msg && /已签到|重复签到|已经签|今天已经/i.test(res.msg)) {
    return {
      success: true,
      status: "already_claimed",
      message: `Already checked in today for ${game.name}`,
    };
  }

  return {
    success: false,
    status: "failed",
    message: res.msg || `Sign-in failed with code ${res.code}`,
  };
}
