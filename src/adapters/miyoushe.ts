/**
 * Miyoushe adapter — HoYo China-region check-in via miyoushe.com cookies.
 *
 * Distinct from the HoYoLab adapter: different domains, different cookies
 * (cookie_token_v2 / account_id_v2 / account_mid_v2), different act_ids,
 * and a x-rpc-signgame header to disambiguate per-game endpoints on the
 * shared luna API.
 */

import {
  getMiyousheRoles,
  performMiyousheCheckin,
  getMiyousheCheckinInfo,
} from "@/lib/miyoushe/checkin";
import {
  MIYOUSHE_GAMES,
  type MiyousheGameSlug,
} from "@/lib/miyoushe/constants";
import type { MiyousheCredentials } from "@/lib/miyoushe/client";
import type {
  AccountInfo,
  Capability,
  CredentialField,
  Credentials,
  GameAdapter,
  Task,
  TaskResult,
} from "./types";

const MIYOUSHE_CREDENTIAL_FIELDS: CredentialField[] = [
  { key: "cookieTokenV2", label: "cookie_token_v2", required: true, sensitive: true },
  { key: "accountIdV2", label: "account_id_v2", required: true, sensitive: true },
  { key: "accountMidV2", label: "account_mid_v2", required: false, sensitive: true },
];

const MIYOUSHE_CAPABILITIES: Capability[] = [
  "checkin",
  "checkin_info",
  "list_accounts",
];

function requireMiyousheCreds(c: Credentials): MiyousheCredentials {
  const { cookieTokenV2, accountIdV2, accountMidV2 } = c;
  if (!cookieTokenV2 || !accountIdV2) {
    throw new Error(
      "Miyoushe adapter requires cookieTokenV2 and accountIdV2 credentials"
    );
  }
  return { cookieTokenV2, accountIdV2, accountMidV2 };
}

function createMiyousheAdapter(slug: MiyousheGameSlug): GameAdapter {
  const game = MIYOUSHE_GAMES[slug];

  return {
    slug,
    vendor: "hoyoverse",
    displayName: game.name,
    authMethod: "cookie",
    credentialFields: MIYOUSHE_CREDENTIAL_FIELDS,
    capabilities: MIYOUSHE_CAPABILITIES,

    async verify(creds): Promise<AccountInfo[]> {
      const c = requireMiyousheCreds(creds);
      const roles = await getMiyousheRoles(c, slug);
      return roles.map((r) => ({
        uid: r.game_uid,
        nickname: r.nickname,
        level: r.level,
        server: r.region,
        serverName: r.region_name,
      }));
    },

    async execute(task: Task, creds: Credentials): Promise<TaskResult> {
      let c: MiyousheCredentials;
      try {
        c = requireMiyousheCreds(creds);
      } catch (e) {
        return {
          status: "failed",
          message: e instanceof Error ? e.message : "Invalid credentials",
        };
      }

      switch (task.capability) {
        case "checkin": {
          const roles = await getMiyousheRoles(c, slug);
          if (roles.length === 0) {
            return {
              status: "failed",
              message: `No ${game.name} role bound to this Miyoushe account`,
            };
          }
          const targetUid = task.params?.uid as string | undefined;
          const role =
            (targetUid && roles.find((r) => r.game_uid === targetUid)) ||
            roles[0];

          const result = await performMiyousheCheckin(c, slug, role);
          return {
            status:
              result.status === "already_claimed" ? "already_done" : result.status,
            message: result.message,
            reward: result.reward,
          };
        }

        case "checkin_info": {
          const roles = await getMiyousheRoles(c, slug);
          if (roles.length === 0) {
            return {
              status: "failed",
              message: `No ${game.name} role bound to this Miyoushe account`,
            };
          }
          const info = await getMiyousheCheckinInfo(c, slug, roles[0]);
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
            message: `Miyoushe adapter does not support capability: ${task.capability}`,
          };
      }
    },
  };
}

export const MIYOUSHE_ADAPTERS: Record<MiyousheGameSlug, GameAdapter> = {
  "genshin-cn": createMiyousheAdapter("genshin-cn"),
  "starrail-cn": createMiyousheAdapter("starrail-cn"),
  "zzz-cn": createMiyousheAdapter("zzz-cn"),
};
