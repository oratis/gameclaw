/**
 * Kuro adapter — wraps src/lib/kuro/* code.
 *
 * Currently supports Wuthering Waves (鸣潮). Adding Punishing Gray Raven (战双)
 * is a one-line registry addition once the gameId is filled in
 * src/lib/kuro/constants.ts.
 */

import {
  getKuroRoles,
  performKuroBbsCheckin,
  performKuroCheckin,
} from "@/lib/kuro/checkin";
import { KURO_GAMES, type KuroGameSlug } from "@/lib/kuro/constants";
import type {
  AccountInfo,
  Capability,
  CredentialField,
  Credentials,
  GameAdapter,
  Task,
  TaskResult,
} from "./types";

const KURO_CREDENTIAL_FIELDS: CredentialField[] = [
  { key: "token", label: "Kurobbs Token (JWT)", required: true, sensitive: true },
];

const KURO_CAPABILITIES: Capability[] = [
  "checkin",
  "list_accounts",
  "bbs_daily_task",
];

function requireKuroToken(c: Credentials): string {
  const token = c.token;
  if (!token) throw new Error("Kuro adapter requires a `token` credential");
  return token;
}

function createKuroAdapter(slug: KuroGameSlug): GameAdapter {
  const game = KURO_GAMES[slug];

  return {
    slug,
    vendor: "kuro",
    displayName: game.name,
    authMethod: "token",
    credentialFields: KURO_CREDENTIAL_FIELDS,
    capabilities: KURO_CAPABILITIES,

    async verify(creds): Promise<AccountInfo[]> {
      const token = requireKuroToken(creds);
      const roles = await getKuroRoles(token, slug);
      return roles.map((r) => ({
        uid: r.roleId,
        nickname: r.roleName ?? r.roleId,
        server: r.serverId,
        serverName: r.serverName,
      }));
    },

    async execute(task: Task, creds: Credentials): Promise<TaskResult> {
      let token: string;
      try {
        token = requireKuroToken(creds);
      } catch (e) {
        return {
          status: "failed",
          message: e instanceof Error ? e.message : "Invalid credentials",
        };
      }

      switch (task.capability) {
        case "checkin": {
          const roles = await getKuroRoles(token, slug);
          if (roles.length === 0) {
            return {
              status: "failed",
              message: `No ${game.name} role bound to this Kuro account`,
            };
          }
          // Optional override via task.params.roleId; otherwise take the first role.
          const targetRoleId = task.params?.roleId as string | undefined;
          const role =
            (targetRoleId && roles.find((r) => r.roleId === targetRoleId)) ||
            roles[0];

          const result = await performKuroCheckin(token, slug, role);
          return {
            status:
              result.status === "already_claimed" ? "already_done" : result.status,
            message: result.message,
            reward: result.reward,
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

        case "bbs_daily_task": {
          const result = await performKuroBbsCheckin(token);
          return {
            status:
              result.status === "already_claimed" ? "already_done" : result.status,
            message: result.message,
          };
        }

        default:
          return {
            status: "failed",
            message: `Kuro adapter does not support capability: ${task.capability}`,
          };
      }
    },
  };
}

export const KURO_ADAPTERS: Record<KuroGameSlug, GameAdapter> = {
  wuwa: createKuroAdapter("wuwa"),
};
