import { HoYoLabClient } from "./client";
import type { GameRoleInfo, GameRolesData } from "./types";

const GAME_ROLES_URL =
  "https://api-os-takumi.mihoyo.com/binding/api/getUserGameRolesByCookie";

export async function getGameAccounts(
  ltokenV2: string,
  ltuidV2: string
): Promise<GameRoleInfo[]> {
  try {
    const client = new HoYoLabClient(ltokenV2, ltuidV2);
    const res = await client.request<GameRolesData>(GAME_ROLES_URL);
    if (res.retcode === 0 && res.data?.list) {
      return res.data.list;
    }
    return [];
  } catch {
    return [];
  }
}

export async function validateCookies(
  ltokenV2: string,
  ltuidV2: string
): Promise<boolean> {
  const accounts = await getGameAccounts(ltokenV2, ltuidV2);
  return accounts.length > 0;
}
