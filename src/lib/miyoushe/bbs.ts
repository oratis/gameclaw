/**
 * 米游社 forum daily sign-in. Separate from per-game signin (which awards
 * primogems / stellar jade / etc.) — this awards community-side rewards
 * and is per-game-id keyed.
 *
 * Endpoint: POST https://bbs-api.miyoushe.com/apihub/app/api/signIn
 * Body: { gids: <gameId> } URL-encoded
 *
 * gids per game:
 *   2 = 原神, 6 = 崩坏：星穹铁道, 8 = 绝区零, 1 = 崩坏3, 4 = 未定事件簿,
 *   5 = 大别野
 */

import { MiyousheClient, type MiyousheCredentials } from "./client";

const BBS_SIGN_URL = "https://bbs-api.miyoushe.com/apihub/app/api/signIn";

/** Game ID for 米游社 BBS signIn (different from the act_id used for game-side signin) */
const MIYOUSHE_BBS_GIDS: Record<string, number> = {
  "genshin-cn": 2,
  "starrail-cn": 6,
  "zzz-cn": 8,
  "honkai3rd-cn": 1,
  "tears-cn": 4,
};

export interface MiyousheBbsResult {
  ok: boolean;
  alreadyDone: boolean;
  message: string;
}

export async function performMiyousheBbsSign(
  creds: MiyousheCredentials,
  gameSlug: string
): Promise<MiyousheBbsResult> {
  const gids = MIYOUSHE_BBS_GIDS[gameSlug];
  if (!gids) {
    return {
      ok: false,
      alreadyDone: false,
      message: `No BBS gids mapping for ${gameSlug}`,
    };
  }

  const client = new MiyousheClient(creds);
  try {
    const res = await client.request<unknown>(BBS_SIGN_URL, "POST", { gids });
    if (res.retcode === 0) {
      return {
        ok: true,
        alreadyDone: false,
        message: `米游社签到成功`,
      };
    }
    if (
      res.retcode === 1008 ||
      /已签|今天已签|repeat/i.test(res.message ?? "")
    ) {
      return {
        ok: true,
        alreadyDone: true,
        message: `米游社今日已签到`,
      };
    }
    return {
      ok: false,
      alreadyDone: false,
      message: res.message || `米游社签到失败 (code ${res.retcode})`,
    };
  } catch (e) {
    return {
      ok: false,
      alreadyDone: false,
      message: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
