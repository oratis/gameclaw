export interface SklandResponse<T> {
  code: number;
  message?: string;
  msg?: string;
  data?: T;
}

export interface HypergryphAuthResponse {
  status: number;
  msg?: string;
  data?: { code: string };
}

export interface SklandAuthData {
  cred: string;
  /** Signing token (different from Hypergryph login token). */
  token: string;
}

export interface SklandBindingChannel {
  uid: string;
  isDefault: boolean;
  channelMasterId: string;
  channelName: string;
  nickName: string;
}

export interface SklandBindingItem {
  appCode: string;
  gameId: number;
  bindingList: SklandBindingChannel[];
}

export interface SklandBindingData {
  list: SklandBindingItem[];
}

export interface SklandCharacter {
  /** Logical app: 'arknights' | 'endfield' | etc. */
  appCode: string;
  /** In-game UID. */
  uid: string;
  /** Server channel ID, used as gameId in attendance request. */
  channelMasterId: string;
  channelName: string;
  nickName: string;
}

export interface SklandAttendanceData {
  awards?: Array<{
    resource: { name: string };
    count: number;
  }>;
}
