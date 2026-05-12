/**
 * HoYoLab real-time "daily note" — current stamina/resin, expedition status,
 * daily-commission progress, weekly boss resin, etc. Read-only.
 *
 * One endpoint per game-biz; each is gated by the DS dynamic-secret header.
 * The structured response varies per game; we forward whatever HoYo returns
 * via TaskResult.data (no canonical shape — clients render per-game).
 */

import { HoYoLabClient } from "./client";
import { GAMES } from "./constants";
import { GAME_RECORD_HEADERS_BASE, generateDS } from "./ds";
import { getGameAccounts } from "./account";
import type { GameSlug } from "@/types/games";
import type { HoYoLabResponse } from "./types";

/**
 * Per-game-biz daily-note endpoint config. Only games HoYo actually exposes
 * real-time notes for are listed; honkai3rd / tears are absent (no API).
 */
interface NoteEndpoint {
  url: string;
  query: (server: string, uid: string) => string;
  /** game_biz prefix to filter the right role from getUserGameRolesByCookie */
  bizPrefix: string;
}

const NOTE_ENDPOINTS: Partial<Record<GameSlug, NoteEndpoint>> = {
  genshin: {
    url: "https://sg-public-api.hoyolab.com/event/game_record/genshin/api/dailyNote",
    query: (server, uid) => `server=${server}&role_id=${uid}`,
    bizPrefix: "hk4e_",
  },
  starrail: {
    url: "https://sg-public-api.hoyolab.com/event/game_record/hkrpg/api/note",
    query: (server, uid) => `server=${server}&role_id=${uid}`,
    bizPrefix: "hkrpg_",
  },
  zzz: {
    url: "https://sg-act-nap-api.hoyolab.com/event/game_record_zzz/api/zzz/note",
    query: (server, uid) => `server=${server}&role_id=${uid}`,
    bizPrefix: "nap_",
  },
};

export interface AccountStatusResult {
  ok: boolean;
  message: string;
  data?: Record<string, unknown>;
  /** Human-friendly one-line summary, useful for chat surfaces. */
  summary?: string;
}

/**
 * Render a one-line summary from the per-game response shape.
 * Best-effort — falls back to "online" if shape changes.
 */
function summarize(slug: GameSlug, data: Record<string, unknown> | undefined): string {
  if (!data) return `${GAMES[slug].name} state retrieved`;
  switch (slug) {
    case "genshin": {
      const resin = data.current_resin ?? "?";
      const max = data.max_resin ?? 200;
      const tasks = data.finished_task_num ?? "?";
      const taskMax = data.total_task_num ?? 4;
      return `Resin ${resin}/${max}, dailies ${tasks}/${taskMax}`;
    }
    case "starrail": {
      const stam = data.current_stamina ?? "?";
      const max = data.max_stamina ?? 240;
      const dt = data.current_train_score ?? "?";
      const dtMax = data.max_train_score ?? 500;
      return `Power ${stam}/${max}, daily training ${dt}/${dtMax}`;
    }
    case "zzz": {
      const energy = (data.energy as Record<string, unknown>)?.progress as
        | Record<string, unknown>
        | undefined;
      const cur = energy?.current ?? "?";
      const max = energy?.max ?? 240;
      return `Battery ${cur}/${max}`;
    }
    default:
      return `${GAMES[slug].name} state retrieved`;
  }
}

export async function getAccountStatus(
  gameSlug: GameSlug,
  ltokenV2: string,
  ltuidV2: string
): Promise<AccountStatusResult> {
  const endpoint = NOTE_ENDPOINTS[gameSlug];
  if (!endpoint) {
    return {
      ok: false,
      message: `account_status not supported for ${gameSlug} (HoYoLab doesn't expose it)`,
    };
  }

  // Resolve the role for this game (uid + server)
  const allRoles = await getGameAccounts(ltokenV2, ltuidV2);
  const role = allRoles.find((r) => r.game_biz.startsWith(endpoint.bizPrefix));
  if (!role) {
    return {
      ok: false,
      message: `No ${GAMES[gameSlug].name} role bound to this account`,
    };
  }

  const query = endpoint.query(role.region, role.game_uid);
  const url = `${endpoint.url}?${query}`;

  const client = new HoYoLabClient(ltokenV2, ltuidV2);
  try {
    const res = await client.request<Record<string, unknown>>(url, "GET", undefined, {
      ...GAME_RECORD_HEADERS_BASE,
      DS: generateDS(),
    });
    if (res.retcode !== 0) {
      return {
        ok: false,
        message: `HoYoLab returned retcode ${res.retcode}: ${res.message}`,
      };
    }
    const data = res.data as Record<string, unknown>;
    return {
      ok: true,
      message: "ok",
      data,
      summary: summarize(gameSlug, data),
    };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
