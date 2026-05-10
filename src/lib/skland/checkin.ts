import { SklandClient } from "./client";
import { SKLAND_APP_NAMES, SKLAND_BOARDS } from "./constants";
import type { SklandCharacter } from "./types";
import type { CheckInResult } from "@/types/games";

/**
 * Filter Skland's flat character list to a single appCode (e.g. 'arknights').
 */
export function charactersForApp(
  characters: SklandCharacter[],
  appCode: string
): SklandCharacter[] {
  return characters.filter((c) => c.appCode === appCode);
}

export async function getSklandCharacters(
  hgToken: string,
  appCode: string
): Promise<SklandCharacter[]> {
  const client = await SklandClient.fromHypergryphToken(hgToken);
  const all = await client.getBindings();
  return charactersForApp(all, appCode);
}

/**
 * Run game-side daily attendance for every character bound to the given app.
 * Returns aggregated CheckInResult — `success` if any character signed,
 * `already_claimed` if all were already done, otherwise `failed`.
 */
export async function performSklandAttendance(
  hgToken: string,
  appCode: string
): Promise<CheckInResult> {
  const appName = SKLAND_APP_NAMES[appCode] ?? appCode;
  const client = await SklandClient.fromHypergryphToken(hgToken);
  const all = await client.getBindings();
  const characters = charactersForApp(all, appCode);

  if (characters.length === 0) {
    return {
      success: false,
      status: "failed",
      message: `No ${appName} character bound to this Skland account`,
    };
  }

  let signed = 0;
  let already = 0;
  let failed = 0;
  const rewards: string[] = [];
  const errors: string[] = [];

  for (const character of characters) {
    try {
      const res = await client.attendance(character);
      if (res.code === 0) {
        signed++;
        if (res.data?.awards) {
          rewards.push(
            res.data.awards.map((a) => `${a.resource.name}×${a.count}`).join(",")
          );
        }
      } else if (
        res.message &&
        /已经签|已签|签过|attended/i.test(res.message)
      ) {
        already++;
      } else {
        failed++;
        errors.push(`${character.channelName}/${character.nickName}: ${res.message}`);
      }
    } catch (e) {
      failed++;
      errors.push(
        `${character.channelName}/${character.nickName}: ${e instanceof Error ? e.message : "unknown"}`
      );
    }
  }

  if (signed > 0) {
    return {
      success: true,
      status: "success",
      message: `${appName} signed ${signed} character(s)${already ? `, ${already} already done` : ""}${failed ? `, ${failed} failed` : ""}`,
      reward: rewards.join(" | ") || undefined,
    };
  }
  if (already === characters.length) {
    return {
      success: true,
      status: "already_claimed",
      message: `Already checked in today for all ${characters.length} ${appName} character(s)`,
    };
  }
  return {
    success: false,
    status: "failed",
    message: errors.join("; ") || `Sign-in failed for all ${characters.length} character(s)`,
  };
}

/**
 * Run forum-board check-in across all 4 Skland boards. Independent of game
 * attendance — these are separate "check tickets" with their own rewards.
 */
export async function performSklandBoardCheckin(
  hgToken: string
): Promise<CheckInResult> {
  const client = await SklandClient.fromHypergryphToken(hgToken);
  let signed = 0;
  let already = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const board of SKLAND_BOARDS) {
    try {
      const res = await client.boardCheckin(board.id);
      if (res.code === 0) {
        signed++;
      } else if (res.message && /已经签|已签|签过|attended/i.test(res.message)) {
        already++;
      } else {
        failed++;
        errors.push(`${board.name}: ${res.message}`);
      }
    } catch (e) {
      failed++;
      errors.push(`${board.name}: ${e instanceof Error ? e.message : "unknown"}`);
    }
  }

  if (signed > 0) {
    return {
      success: true,
      status: "success",
      message: `Signed ${signed} board(s)${already ? `, ${already} already done` : ""}${failed ? `, ${failed} failed` : ""}`,
    };
  }
  if (already === SKLAND_BOARDS.length) {
    return {
      success: true,
      status: "already_claimed",
      message: `All ${SKLAND_BOARDS.length} Skland boards already checked in today`,
    };
  }
  return {
    success: false,
    status: "failed",
    message: errors.join("; ") || "All board check-ins failed",
  };
}
