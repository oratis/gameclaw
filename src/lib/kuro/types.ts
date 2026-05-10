export interface KuroResponse<T> {
  code: number;
  msg: string;
  success?: boolean;
  data?: T;
}

export interface KuroRole {
  serverId: string;
  serverName: string;
  roleId: string;
  roleName?: string;
  userId: number;
  gameId: number;
  fashionUrl?: string;
  iconUrl?: string;
}

export interface KuroSignRecordItem {
  goodsName: string;
  goodsUrl?: string;
  goodsNum?: number;
}
