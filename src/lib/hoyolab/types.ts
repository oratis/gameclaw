export interface HoYoLabResponse<T> {
  retcode: number;
  message: string;
  data: T;
}

export interface CheckInSignData {
  code: string;
  risk_code: number;
  gt: string;
  challenge: string;
  success: number;
  is_risk: boolean;
}

export interface CheckInInfoData {
  total_sign_day: number;
  today: string;
  is_sign: boolean;
  first_bind: boolean;
  is_sub: boolean;
  region: string;
  month_last_day: boolean;
}

export interface CheckInReward {
  icon: string;
  name: string;
  cnt: number;
}

export interface CheckInRewardsData {
  month: number;
  awards: CheckInReward[];
}

export interface GameRoleInfo {
  game_biz: string;
  region: string;
  game_uid: string;
  nickname: string;
  level: number;
  is_chosen: boolean;
  region_name: string;
  is_official: boolean;
}

export interface GameRolesData {
  list: GameRoleInfo[];
}
