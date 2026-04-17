import { GAMES } from "./constants";
import { HoYoLabClient } from "./client";
import type { CheckInInfoData, CheckInSignData } from "./types";
import type { CheckInResult, GameSlug } from "@/types/games";

export async function performCheckin(
  gameSlug: GameSlug,
  ltokenV2: string,
  ltuidV2: string
): Promise<CheckInResult> {
  const game = GAMES[gameSlug];
  if (!game) {
    return { success: false, status: "failed", message: `Unknown game: ${gameSlug}` };
  }

  try {
    const client = new HoYoLabClient(ltokenV2, ltuidV2);

    const res = await client.request<CheckInSignData>(
      `${game.checkinUrl}?act_id=${game.actId}`,
      "POST",
      { act_id: game.actId }
    );

    if (res.retcode === 0) {
      return {
        success: true,
        status: "success",
        message: `Successfully checked in for ${game.name}`,
      };
    }

    if (res.retcode === -5003) {
      return {
        success: true,
        status: "already_claimed",
        message: `Already checked in today for ${game.name}`,
      };
    }

    return {
      success: false,
      status: "failed",
      message: res.message || `Check-in failed with code ${res.retcode}`,
    };
  } catch (error) {
    return {
      success: false,
      status: "failed",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getCheckinInfo(
  gameSlug: GameSlug,
  ltokenV2: string,
  ltuidV2: string
): Promise<CheckInInfoData | null> {
  const game = GAMES[gameSlug];
  if (!game) return null;

  try {
    const client = new HoYoLabClient(ltokenV2, ltuidV2);

    const res = await client.request<CheckInInfoData>(
      `${game.infoUrl}?act_id=${game.actId}`
    );
    if (res.retcode === 0) return res.data;
    return null;
  } catch {
    return null;
  }
}
