/**
 * Skland adapter — Hypergryph 森空岛 BBS for 明日方舟 (Arknights) and other
 * Hypergryph games. Authenticates via Hypergryph token (long-lived) which is
 * exchanged via OAuth → Skland cred + signing token at request time.
 *
 * v1 supports: arknights checkin (game/attendance), list_accounts.
 * Future: forum board checkin (score/checkin), 终末地, 泡姆泡姆.
 */

import {
  getSklandCharacters,
  performSklandAttendance,
} from "@/lib/skland/checkin";
import { SKLAND_APP_NAMES } from "@/lib/skland/constants";
import type {
  AccountInfo,
  Capability,
  CredentialField,
  Credentials,
  GameAdapter,
  Task,
  TaskResult,
} from "./types";

const SKLAND_CREDENTIAL_FIELDS: CredentialField[] = [
  {
    key: "hgToken",
    label: "Hypergryph Token (鹰角通行证)",
    required: true,
    sensitive: true,
  },
];

const SKLAND_CAPABILITIES: Capability[] = ["checkin", "list_accounts"];

interface SklandGameConfig {
  slug: string;
  appCode: string;
  displayName: string;
}

const SKLAND_GAMES: Record<string, SklandGameConfig> = {
  arknights: {
    slug: "arknights",
    appCode: "arknights",
    displayName: SKLAND_APP_NAMES.arknights,
  },
};

function requireHgToken(c: Credentials): string {
  const token = c.hgToken;
  if (!token) {
    throw new Error("Skland adapter requires `hgToken` credential");
  }
  return token;
}

function createSklandAdapter(cfg: SklandGameConfig): GameAdapter {
  return {
    slug: cfg.slug,
    vendor: "hypergryph",
    displayName: cfg.displayName,
    authMethod: "token",
    credentialFields: SKLAND_CREDENTIAL_FIELDS,
    capabilities: SKLAND_CAPABILITIES,

    async verify(creds): Promise<AccountInfo[]> {
      const token = requireHgToken(creds);
      const characters = await getSklandCharacters(token, cfg.appCode);
      return characters.map((c) => ({
        uid: c.uid,
        nickname: c.nickName,
        server: c.channelMasterId,
        serverName: c.channelName,
      }));
    },

    async execute(task: Task, creds: Credentials): Promise<TaskResult> {
      let token: string;
      try {
        token = requireHgToken(creds);
      } catch (e) {
        return {
          status: "failed",
          message: e instanceof Error ? e.message : "Invalid credentials",
        };
      }

      switch (task.capability) {
        case "checkin": {
          const result = await performSklandAttendance(token, cfg.appCode);
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
            message: `${accounts.length} ${cfg.displayName} character(s) found`,
            data: accounts,
          };
        }

        default:
          return {
            status: "failed",
            message: `Skland adapter does not support capability: ${task.capability}`,
          };
      }
    },
  };
}

export const SKLAND_ADAPTERS: Record<string, GameAdapter> = {
  arknights: createSklandAdapter(SKLAND_GAMES.arknights),
};
