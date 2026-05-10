import { MiyousheClient, type MiyousheCredentials } from "./client";
import {
  MIYOUSHE_GAMES,
  TAKUMI_BASE,
  type MiyousheGameSlug,
} from "./constants";
import type {
  MiyousheRole,
  MiyousheRolesData,
  MiyousheSignData,
  MiyousheSignInfoData,
} from "./types";
import type { CheckInResult } from "@/types/games";

const ROLES_URL = `${TAKUMI_BASE}/binding/api/getUserGameRolesByCookie`;

export async function getMiyousheRoles(
  creds: MiyousheCredentials,
  gameSlug: MiyousheGameSlug
): Promise<MiyousheRole[]> {
  const game = MIYOUSHE_GAMES[gameSlug];
  const client = new MiyousheClient(creds);
  try {
    const res = await client.request<MiyousheRolesData>(
      `${ROLES_URL}?game_biz=${game.gameBiz}`
    );
    if (res.retcode === 0 && res.data?.list) {
      return res.data.list.filter((r) => r.game_biz === game.gameBiz);
    }
    return [];
  } catch {
    return [];
  }
}

export async function performMiyousheCheckin(
  creds: MiyousheCredentials,
  gameSlug: MiyousheGameSlug,
  role: MiyousheRole
): Promise<CheckInResult> {
  const game = MIYOUSHE_GAMES[gameSlug];
  const client = new MiyousheClient(creds, game.signGameHeader);

  const url = `${game.apiBase}/event/luna/sign?act_id=${game.actId}`;
  try {
    const res = await client.request<MiyousheSignData>(url, "POST", {
      act_id: game.actId,
      region: role.region,
      uid: role.game_uid,
      lang: "zh-cn",
    });

    if (res.retcode === 0) {
      return {
        success: true,
        status: "success",
        message: `Successfully checked in for ${game.name}`,
      };
    }

    // Common "already signed today" retcodes for miyoushe luna sign API
    if (res.retcode === -5003 || /已签|已经/i.test(res.message)) {
      return {
        success: true,
        status: "already_claimed",
        message: `Already checked in today for ${game.name}`,
      };
    }

    return {
      success: false,
      status: "failed",
      message: res.message || `Sign-in failed with code ${res.retcode}`,
    };
  } catch (error) {
    return {
      success: false,
      status: "failed",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getMiyousheCheckinInfo(
  creds: MiyousheCredentials,
  gameSlug: MiyousheGameSlug,
  role: MiyousheRole
): Promise<MiyousheSignInfoData | null> {
  const game = MIYOUSHE_GAMES[gameSlug];
  const client = new MiyousheClient(creds, game.signGameHeader);

  const url = `${game.apiBase}/event/luna/info?act_id=${game.actId}&region=${role.region}&uid=${role.game_uid}&lang=zh-cn`;
  try {
    const res = await client.request<MiyousheSignInfoData>(url);
    if (res.retcode === 0) return res.data;
    return null;
  } catch {
    return null;
  }
}
