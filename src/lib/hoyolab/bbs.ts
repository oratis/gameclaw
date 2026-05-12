/**
 * HoYoLab forum (BBS) daily signin.
 *
 * Separate from in-game daily check-in: signs the HoYoLAB community itself
 * which awards "community exp" and occasional small in-game rewards. One
 * endpoint serves all HoYoverse games — distinguished by the `gids` param.
 */

import { HoYoLabClient } from "./client";

const BBS_SIGN_URL = "https://bbs-api-os.hoyolab.com/apihub/api/signIn";

export interface BbsSignResult {
  ok: boolean;
  alreadyDone: boolean;
  message: string;
}

export async function performHoYoLabBbsSign(
  ltokenV2: string,
  ltuidV2: string,
  gids: number
): Promise<BbsSignResult> {
  const client = new HoYoLabClient(ltokenV2, ltuidV2);
  try {
    const res = await client.request<unknown>(
      `${BBS_SIGN_URL}?gids=${gids}`,
      "POST"
    );
    if (res.retcode === 0) {
      return { ok: true, alreadyDone: false, message: "HoYoLab BBS signed in" };
    }
    // Common "already signed" codes / messages
    if (res.retcode === 1008 || /already|签过|已签/i.test(res.message ?? "")) {
      return {
        ok: true,
        alreadyDone: true,
        message: "HoYoLab BBS already signed in today",
      };
    }
    return {
      ok: false,
      alreadyDone: false,
      message: res.message || `BBS sign-in failed (code ${res.retcode})`,
    };
  } catch (e) {
    return {
      ok: false,
      alreadyDone: false,
      message: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
