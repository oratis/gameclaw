export interface MiyousheResponse<T> {
  retcode: number;
  message: string;
  data: T;
}

export interface MiyousheRole {
  game_biz: string;
  region: string;
  game_uid: string;
  nickname: string;
  level: number;
  is_chosen: boolean;
  region_name: string;
  is_official: boolean;
}

export interface MiyousheRolesData {
  list: MiyousheRole[];
}

export interface MiyousheSignData {
  code: string;
  risk_code: number;
  gt: string;
  challenge: string;
  success: number;
  is_risk: boolean;
}

export interface MiyousheSignInfoData {
  total_sign_day: number;
  today: string;
  is_sign: boolean;
  is_sub: boolean;
  region: string;
  short_sign_day: number;
  sign_cnt_missed: number;
}
