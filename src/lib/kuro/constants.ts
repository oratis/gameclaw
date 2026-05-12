export const KURO_API_BASE = "https://api.kurobbs.com";

export type KuroGameSlug = "wuwa" | "punishing";

export interface KuroGameConfig {
  name: string;
  slug: KuroGameSlug;
  gameId: number;
}

export const KURO_GAMES: Record<KuroGameSlug, KuroGameConfig> = {
  wuwa: {
    name: "Wuthering Waves (鸣潮)",
    slug: "wuwa",
    gameId: 3,
  },
  punishing: {
    name: "Punishing: Gray Raven (战双帕弥什)",
    slug: "punishing",
    gameId: 2,
  },
};

export const KURO_GAME_SLUGS: KuroGameSlug[] = Object.keys(KURO_GAMES) as KuroGameSlug[];

export const KURO_HEADERS: Record<string, string> = {
  "User-Agent": "okhttp/3.11.0",
  "Content-Type": "application/x-www-form-urlencoded",
  source: "android",
  version: "2.2.5",
  versionCode: "2250",
  osVersion: "Android",
  countryCode: "CN",
  lang: "zh-Hans",
};
