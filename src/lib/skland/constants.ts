export const HYPERGRYPH_BASE = "https://as.hypergryph.com";
export const SKLAND_BASE = "https://zonai.skland.com";

export const HYPERGRYPH_OAUTH_PATH = "/user/oauth2/v2/grant";
export const SKLAND_AUTH_PATH = "/api/v1/user/auth/generate_cred_by_code";
export const SKLAND_BINDING_PATH = "/api/v1/game/player/binding";
export const SKLAND_ATTENDANCE_PATH = "/api/v1/game/attendance";
export const SKLAND_BOARD_CHECKIN_PATH = "/api/v1/score/checkin";

/** Static appCode for Skland's Hypergryph oauth registration. */
export const SKLAND_APP_CODE = "4ca99fa6b56cc2ba";

/** Mirrors the upstream Skland Android client to look like a real app. */
export const SKLAND_USER_AGENT =
  "Skland/1.21.0 (com.hypergryph.skland; build:102100065; Android 34; ) Okhttp/4.11.0";
export const SKLAND_VNAME = "1.21.0";

/** appCode → human display name (used to filter to a specific game). */
export const SKLAND_APP_NAMES: Record<string, string> = {
  arknights: "明日方舟",
  endfield: "明日方舟: 终末地",
  popucom: "泡姆泡姆",
};
