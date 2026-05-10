/**
 * GameAdapter — the contract every game integration must implement.
 *
 * Each game (e.g. genshin, wuwa, arknights) is one adapter instance.
 * Adapters are stateless and receive credentials per call so they can be
 * shared across users.
 */

export type AuthMethod = "cookie" | "oauth" | "token";

export type Capability =
  // Tier 1 — public web/BBS API surface (live)
  | "checkin"               // game-side daily check-in (signin reward)
  | "checkin_info"          // query check-in streak / today's status
  | "list_accounts"         // enumerate game accounts visible to the credentials
  | "bbs_daily_task"        // forum/BBS daily tasks (community signin, multi-board signin)
  | "redeem_code"           // exchange a gift code for in-game rewards
  | "account_status"        // read-only "daily note" — resin / trailblaze power / etc.
  // Tier 2 — semi-public client API (next milestone)
  | "mail_claim"            // claim in-game mail rewards
  | "stamina_spend"         // dispatch / commission to consume stamina
  // Tier 3 — L3 vision worker (Pro+ only; M3 fleet not yet deployed)
  | "weekly_dungeon"        // weekly bosses, dungeons, end-game gauntlets
  | "infrastructure_shift"  // Arknights base management (MAA's strength)
  | "material_farm"         // run a stage N times for drops
  | "auto_battle";          // generic per-stage auto-fight

export interface CredentialField {
  /** Internal key used in the Credentials map. */
  key: string;
  /** Human-friendly label shown in UI / docs. */
  label: string;
  required: boolean;
  /** Sensitive fields are encrypted at rest and never logged. */
  sensitive: boolean;
}

/**
 * Raw credentials passed to an adapter. The shape is adapter-specific:
 * - HoYoLab: { ltokenV2, ltuidV2 }
 * - Future Kuro: { token, ... }
 * Validate via the adapter's `credentialFields` declaration.
 */
export type Credentials = Record<string, string>;

export interface AccountInfo {
  uid: string;
  nickname: string;
  level?: number;
  server?: string;
  serverName?: string;
}

export interface Task {
  capability: Capability;
  /** Capability-specific parameters. */
  params?: Record<string, unknown>;
}

export type TaskStatus = "success" | "already_done" | "failed" | "skipped";

export interface TaskResult {
  status: TaskStatus;
  message: string;
  reward?: string;
  /** Capability-specific structured output. */
  data?: unknown;
}

export interface GameAdapter {
  /** Stable game identifier, e.g. "genshin", "wuwa". URL-safe. */
  slug: string;
  /** Publisher / vendor, e.g. "hoyoverse", "kuro", "yostar". */
  vendor: string;
  /** Human-readable game name. */
  displayName: string;
  authMethod: AuthMethod;
  credentialFields: CredentialField[];
  capabilities: Capability[];

  /**
   * Validate credentials and return all accounts visible for this game.
   * Empty array means credentials are valid but the user has no account
   * in this specific game.
   */
  verify(creds: Credentials): Promise<AccountInfo[]>;

  /** Execute a single task. Errors should be returned as failed TaskResult, not thrown. */
  execute(task: Task, creds: Credentials): Promise<TaskResult>;
}
