import { KuroClient } from "./client";
import { KURO_API_BASE, KURO_GAMES, type KuroGameSlug } from "./constants";
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

/**
 * Forum-side daily multi-step task chain (库街区 community).
 *
 * Includes:
 *   - signin (`/user/signIn` gameId=2)
 *   - share post (`/encourage/level/shareTask` gameId=3)
 * Skipped (need post-id pool):
 *   - browse 3 posts
 *   - like 5 posts
 *
 * Each sub-task is best-effort: if any one fails we still try the others
 * and report a roll-up. Returns success if ≥1 sub-task succeeded.
 */
export async function performKuroBbsMultiStep(
  token: string
): Promise<CheckInResult> {
  const client = new KuroClient(token);
  const messages: string[] = [];
  const successes: string[] = [];

  // Step 1: forum signin
  try {
    const res = await client.post<unknown>(`${KURO_API_BASE}/user/signIn`, {
      gameId: 2,
    });
    if (res.code === 200) {
      successes.push("签到");
    } else if (
      res.msg &&
      /已签|重复签到|已经签|今天已经/i.test(res.msg)
    ) {
      successes.push("签到(已签)");
    } else {
      messages.push(`签到: ${res.msg ?? "code " + res.code}`);
    }
  } catch (e) {
    messages.push(`签到 异常: ${e instanceof Error ? e.message : "unknown"}`);
  }

  // Step 2: share task
  try {
    const res = await client.post<unknown>(
      `${KURO_API_BASE}/encourage/level/shareTask`,
      { gameId: 3 }
    );
    if (res.code === 200) {
      successes.push("分享");
    } else if (
      res.msg &&
      /已分享|已完成|today/i.test(res.msg)
    ) {
      successes.push("分享(已做)");
    } else {
      messages.push(`分享: ${res.msg ?? "code " + res.code}`);
    }
  } catch (e) {
    messages.push(`分享 异常: ${e instanceof Error ? e.message : "unknown"}`);
  }

  if (successes.length === 0) {
    return {
      success: false,
      status: "failed",
      message: messages.join("; ") || "All Kuro BBS sub-tasks failed",
    };
  }

  return {
    success: true,
    status: "success",
    message: `库街区完成: ${successes.join(", ")}${messages.length ? ` (${messages.length} 跳过)` : ""}`,
  };
}

/**
 * Forum-side daily sign-in (库街区 community), independent of any specific
 * game's daily reward. Endpoint expects `gameId=2` for the BBS itself.
 *
 * Single-step variant; the multi-step `performKuroBbsMultiStep` is the
 * preferred entry point. Kept for compatibility.
 */
export async function performKuroBbsCheckin(
  token: string
): Promise<CheckInResult> {
  const client = new KuroClient(token);
  try {
    const res = await client.post<unknown>(`${KURO_API_BASE}/user/signIn`, {
      gameId: 2,
    });
    if (res.code === 200) {
      return {
        success: true,
        status: "success",
        message: "库街区论坛签到成功",
      };
    }
    if (res.msg && /已签|重复签到|已经签|今天已经/i.test(res.msg)) {
      return {
        success: true,
        status: "already_claimed",
        message: `库街区今日已签到`,
      };
    }
    return {
      success: false,
      status: "failed",
      message: res.msg || `BBS sign-in failed with code ${res.code}`,
    };
  } catch (e) {
    return {
      success: false,
      status: "failed",
      message: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
