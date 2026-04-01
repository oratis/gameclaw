export type GameSlug = "genshin" | "starrail" | "honkai3rd" | "zzz" | "tears";

export interface GameConfig {
  name: string;
  slug: GameSlug;
  actId: string;
  checkinUrl: string;
  infoUrl: string;
  rewardUrl?: string;
  gameId: string;
  icon: string;
  color: string;
  description: string;
}

export interface CheckInResult {
  success: boolean;
  status: "success" | "already_claimed" | "failed";
  message: string;
  reward?: string;
}

export interface CheckInInfo {
  totalSignDay: number;
  today: string;
  isSign: boolean;
}

export interface GameAccountInfo {
  gameId: string;
  uid: string;
  nickname: string;
  level: number;
  server: string;
  serverName: string;
}

export interface HoYoLabResponse<T> {
  retcode: number;
  message: string;
  data: T;
}
