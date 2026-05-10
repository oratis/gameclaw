/**
 * HoYoLab adapter — wraps the existing src/lib/hoyolab/* code.
 *
 * One adapter instance per game (5 total). All instances share the same
 * vendor=hoyoverse and credential shape (ltoken_v2 / ltuid_v2 cookies).
 */

import { GAMES } from "@/lib/hoyolab/constants";
import { performCheckin, getCheckinInfo } from "@/lib/hoyolab/checkin";
import { getGameAccounts } from "@/lib/hoyolab/account";
import type { GameSlug } from "@/types/games";
import type {
  AccountInfo,
  Capability,
  CredentialField,
  Credentials,
  GameAdapter,
  Task,
  TaskResult,
} from "./types";

const HOYOLAB_CREDENTIAL_FIELDS: CredentialField[] = [
  { key: "ltokenV2", label: "ltoken_v2", required: true, sensitive: true },
  { key: "ltuidV2", label: "ltuid_v2", required: true, sensitive: true },
];

const HOYOLAB_CAPABILITIES: Capability[] = [
  "checkin",
  "checkin_info",
  "list_accounts",
];

// game_biz prefix returned by HoYoLab's getUserGameRolesByCookie API.
// Matches both global ("hk4e_global") and CN ("hk4e_cn") variants.
const GAME_BIZ_PREFIX: Record<GameSlug, string> = {
  genshin: "hk4e_",
  starrail: "hkrpg_",
  honkai3rd: "bh3_",
  zzz: "nap_",
  tears: "nxx_",
};

function requireHoYoCreds(c: Credentials): { ltokenV2: string; ltuidV2: string } {
  const { ltokenV2, ltuidV2 } = c;
  if (!ltokenV2 || !ltuidV2) {
    throw new Error("HoYoLab adapter requires ltokenV2 and ltuidV2 credentials");
  }
  return { ltokenV2, ltuidV2 };
}

function createHoYoLabAdapter(slug: GameSlug): GameAdapter {
  const game = GAMES[slug];
  const bizPrefix = GAME_BIZ_PREFIX[slug];

  return {
    slug,
    vendor: "hoyoverse",
    displayName: game.name,
    authMethod: "cookie",
    credentialFields: HOYOLAB_CREDENTIAL_FIELDS,
    capabilities: HOYOLAB_CAPABILITIES,

    async verify(creds): Promise<AccountInfo[]> {
      const { ltokenV2, ltuidV2 } = requireHoYoCreds(creds);
      const roles = await getGameAccounts(ltokenV2, ltuidV2);
      return roles
        .filter((r) => r.game_biz.startsWith(bizPrefix))
        .map((r) => ({
          uid: r.game_uid,
          nickname: r.nickname,
          level: r.level,
          server: r.region,
          serverName: r.region_name,
        }));
    },

    async execute(task: Task, creds: Credentials): Promise<TaskResult> {
      let ltokenV2: string;
      let ltuidV2: string;
      try {
        ({ ltokenV2, ltuidV2 } = requireHoYoCreds(creds));
      } catch (e) {
        return {
          status: "failed",
          message: e instanceof Error ? e.message : "Invalid credentials",
        };
      }

      switch (task.capability) {
        case "checkin": {
          const r = await performCheckin(slug, ltokenV2, ltuidV2);
          return {
            status: r.status === "already_claimed" ? "already_done" : r.status,
            message: r.message,
            reward: r.reward,
          };
        }

        case "checkin_info": {
          const info = await getCheckinInfo(slug, ltokenV2, ltuidV2);
          if (!info) {
            return { status: "failed", message: "Could not fetch check-in info" };
          }
          return {
            status: "success",
            message: `${info.total_sign_day} days signed; today=${info.today}; signed=${info.is_sign}`,
            data: info,
          };
        }

        case "list_accounts": {
          const accounts = await this.verify(creds);
          return {
            status: "success",
            message: `${accounts.length} account(s) found for ${game.name}`,
            data: accounts,
          };
        }

        default:
          return {
            status: "failed",
            message: `HoYoLab adapter does not support capability: ${task.capability}`,
          };
      }
    },
  };
}

export const HOYOLAB_ADAPTERS: Record<GameSlug, GameAdapter> = {
  genshin: createHoYoLabAdapter("genshin"),
  starrail: createHoYoLabAdapter("starrail"),
  honkai3rd: createHoYoLabAdapter("honkai3rd"),
  zzz: createHoYoLabAdapter("zzz"),
  tears: createHoYoLabAdapter("tears"),
};
