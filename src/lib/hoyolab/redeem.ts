/**
 * HoYoLab gift code redemption.
 *
 * Per-game endpoint; needs the user's role (uid + region) attached to query.
 * Reference: https://hk4e-api-os.hoyolab.com/common/apicdkey/api/webExchangeCdkey
 *            ?cdkey=...&game_biz=hk4e_global&lang=en&region=os_asia&uid=...
 *
 * Each HoYo game has its own subdomain/path:
 *   genshin   → hk4e-api-os.hoyoverse.com /common/apicdkey/api/webExchangeCdkey
 *   starrail  → sg-hkrpg-api.hoyolab.com /common/apicdkey/api/webExchangeCdkey
 *   zzz       → public-operation-nap.hoyoverse.com /common/apicdkey/api/webExchangeCdkey
 *   honkai3rd → public-operation-nap.hoyoverse.com (bh3 doesn't have one — UI in-game only)
 *   tears     → no public redeem
 */

import { HoYoLabClient } from "./client";
import { getGameAccounts } from "./account";
import { GAMES } from "./constants";
import type { GameSlug } from "@/types/games";

const REDEEM_ENDPOINTS: Partial<
  Record<GameSlug, { url: string; gameBiz: string; bizPrefix: string }>
> = {
  genshin: {
    url: "https://sg-hk4e-api.hoyoverse.com/common/apicdkey/api/webExchangeCdkey",
    gameBiz: "hk4e_global",
    bizPrefix: "hk4e_",
  },
  starrail: {
    url: "https://sg-hkrpg-api.hoyolab.com/common/apicdkey/api/webExchangeCdkey",
    gameBiz: "hkrpg_global",
    bizPrefix: "hkrpg_",
  },
  zzz: {
    url: "https://public-operation-nap.hoyoverse.com/common/apicdkey/api/webExchangeCdkey",
    gameBiz: "nap_global",
    bizPrefix: "nap_",
  },
};

export interface RedeemResult {
  ok: boolean;
  alreadyRedeemed: boolean;
  message: string;
}

const CODE_REGEX = /^[A-Za-z0-9]{4,32}$/;

export async function redeemCode(
  gameSlug: GameSlug,
  ltokenV2: string,
  ltuidV2: string,
  code: string
): Promise<RedeemResult> {
  const endpoint = REDEEM_ENDPOINTS[gameSlug];
  if (!endpoint) {
    return {
      ok: false,
      alreadyRedeemed: false,
      message: `redeem_code not supported for ${GAMES[gameSlug].name}`,
    };
  }
  if (!CODE_REGEX.test(code)) {
    return {
      ok: false,
      alreadyRedeemed: false,
      message: "Invalid code format (expected 4-32 alphanumeric chars)",
    };
  }

  const roles = await getGameAccounts(ltokenV2, ltuidV2);
  const role = roles.find((r) => r.game_biz.startsWith(endpoint.bizPrefix));
  if (!role) {
    return {
      ok: false,
      alreadyRedeemed: false,
      message: `No ${GAMES[gameSlug].name} role bound`,
    };
  }

  const params = new URLSearchParams({
    cdkey: code,
    game_biz: endpoint.gameBiz,
    lang: "en",
    region: role.region,
    uid: role.game_uid,
  });

  const client = new HoYoLabClient(ltokenV2, ltuidV2);
  try {
    const res = await client.request<unknown>(
      `${endpoint.url}?${params.toString()}`,
      "GET"
    );
    if (res.retcode === 0) {
      return {
        ok: true,
        alreadyRedeemed: false,
        message: `Code redeemed for ${GAMES[gameSlug].name}`,
      };
    }
    // Already-redeemed / expired / cdk-not-found common retcodes
    if (
      res.retcode === -2017 || // already claimed by this account
      res.retcode === -2016 || // already in redemption queue
      /already|redeemed|claim/i.test(res.message ?? "")
    ) {
      return {
        ok: true,
        alreadyRedeemed: true,
        message: res.message ?? "Code already redeemed",
      };
    }
    return {
      ok: false,
      alreadyRedeemed: false,
      message: res.message || `Redeem failed (code ${res.retcode})`,
    };
  } catch (e) {
    return {
      ok: false,
      alreadyRedeemed: false,
      message: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
