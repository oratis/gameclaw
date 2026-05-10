/**
 * Miyoushe (HoYo China region) constants.
 *
 * IMPORTANT: act_id values change occasionally (typically once per year per game).
 * If sign-in starts returning retcode like -100 or "invalid act_id", refresh
 * by visiting the in-game sign-in page and reading act_id from the URL.
 *
 * Source of canonical IDs:
 *   https://github.com/UIGF-org/mihoyo-api-collect (community-maintained)
 */

export const TAKUMI_BASE = "https://api-takumi.mihoyo.com";
export const ACT_NAP_BASE = "https://act-nap-api.mihoyo.com"; // ZZZ uses this
export const TAKUMI_RECORD_BASE = "https://api-takumi-record.mihoyo.com";

export type MiyousheGameSlug = "genshin-cn" | "starrail-cn" | "zzz-cn";

export interface MiyousheGameConfig {
  name: string;
  slug: MiyousheGameSlug;
  /** game_biz used for /binding/api/getUserGameRolesByCookie */
  gameBiz: string;
  /** numeric ID per HoYo internal mapping */
  gameId: number;
  /** current sign-in act_id; refresh annually */
  actId: string;
  /** which API host serves the sign endpoints for this game */
  apiBase: string;
  /** value for x-rpc-signgame header */
  signGameHeader: string;
}

export const MIYOUSHE_GAMES: Record<MiyousheGameSlug, MiyousheGameConfig> = {
  "genshin-cn": {
    name: "原神 (CN)",
    slug: "genshin-cn",
    gameBiz: "hk4e_cn",
    gameId: 2,
    actId: "e202311201442471",
    apiBase: TAKUMI_BASE,
    signGameHeader: "hk4e",
  },
  "starrail-cn": {
    name: "崩坏:星穹铁道 (CN)",
    slug: "starrail-cn",
    gameBiz: "hkrpg_cn",
    gameId: 6,
    actId: "e202304121516551",
    apiBase: TAKUMI_BASE,
    signGameHeader: "hkrpg",
  },
  "zzz-cn": {
    name: "绝区零 (CN)",
    slug: "zzz-cn",
    gameBiz: "nap_cn",
    gameId: 8,
    actId: "e202406242138391",
    apiBase: ACT_NAP_BASE,
    signGameHeader: "zzz",
  },
};

export const MIYOUSHE_GAME_SLUGS: MiyousheGameSlug[] = Object.keys(
  MIYOUSHE_GAMES
) as MiyousheGameSlug[];

export const MIYOUSHE_HEADERS_BASE: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) miHoYoBBS/2.55.0",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "zh-CN,zh;q=0.9",
  Origin: "https://webstatic.mihoyo.com",
  Referer: "https://webstatic.mihoyo.com/",
  "x-rpc-app_version": "2.55.0",
  "x-rpc-client_type": "5",
  "x-rpc-platform": "4",
  "x-rpc-device_id": "1234567890ABCDEF",
};
