import type { GameConfig, GameSlug } from "@/types/games";

export const GAMES: Record<GameSlug, GameConfig> = {
  genshin: {
    name: "Genshin Impact",
    slug: "genshin",
    actId: "e202102251931481",
    checkinUrl: "https://sg-hk4e-api.hoyolab.com/event/sol/sign",
    infoUrl: "https://sg-hk4e-api.hoyolab.com/event/sol/info",
    rewardUrl: "https://sg-hk4e-api.hoyolab.com/event/sol/home",
    gameId: "2",
    icon: "/game-icons/genshin.svg",
    color: "#4ECDC4",
    description:
      "Auto daily check-in, claim login rewards, and track resin status",
  },
  starrail: {
    name: "Honkai: Star Rail",
    slug: "starrail",
    actId: "e202303301540311",
    checkinUrl: "https://sg-public-api.hoyolab.com/event/luna/os/sign",
    infoUrl: "https://sg-public-api.hoyolab.com/event/luna/os/info",
    rewardUrl: "https://sg-public-api.hoyolab.com/event/luna/os/home",
    gameId: "6",
    icon: "/game-icons/starrail.svg",
    color: "#7B68EE",
    description:
      "Auto daily check-in, claim Stellar Jade, and monitor trailblaze power",
  },
  honkai3rd: {
    name: "Honkai Impact 3rd",
    slug: "honkai3rd",
    actId: "e202110291205111",
    checkinUrl: "https://sg-public-api.hoyolab.com/event/mani/sign",
    infoUrl: "https://sg-public-api.hoyolab.com/event/mani/info",
    gameId: "1",
    icon: "/game-icons/honkai3rd.svg",
    color: "#FF6B6B",
    description: "Auto daily check-in and claim daily rewards",
  },
  zzz: {
    name: "Zenless Zone Zero",
    slug: "zzz",
    actId: "e202406031448091",
    checkinUrl: "https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/sign",
    infoUrl: "https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/info",
    gameId: "8",
    icon: "/game-icons/zzz.svg",
    color: "#FFD93D",
    description: "Auto daily check-in and claim Polychrome rewards",
  },
  tears: {
    name: "Tears of Themis",
    slug: "tears",
    actId: "e202202281857121",
    checkinUrl: "https://sg-public-api.hoyolab.com/event/luna/os/sign",
    infoUrl: "https://sg-public-api.hoyolab.com/event/luna/os/info",
    gameId: "4",
    icon: "/game-icons/tears.svg",
    color: "#FF8FAB",
    description: "Auto daily check-in and claim S-Chips",
  },
};

export const GAME_SLUGS = Object.keys(GAMES) as GameSlug[];

export const HOYOLAB_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.5",
  Origin: "https://act.hoyolab.com",
  Referer: "https://act.hoyolab.com/",
  "x-rpc-app_version": "2.34.1",
  "x-rpc-client_type": "4",
  "x-rpc-language": "en-us",
};
