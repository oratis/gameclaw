/**
 * HoYoLab Dynamic Secret (DS) header generator.
 *
 * Required for "game_record" API family (real-time notes: resin, trailblaze
 * power, ZZZ battery). Without it the API returns retcode 1034 "risk control".
 *
 * Format:  DS = t,r,md5(salt=SALT&t=T&r=R)
 *
 * SALT_K2 is the published international salt as of 2026-05. Rotates ~once a
 * year. If account_status starts returning 1034 after a HoYo update, refresh
 * this constant from a community ref (genshin_py, ...).
 *
 * Reference: https://github.com/thesadru/genshin.py/blob/master/genshin/utility/ds.py
 */

import { createHash, randomBytes } from "node:crypto";

const SALT_K2 =
  process.env.HOYOLAB_DS_SALT ?? "6cqshh5dhw73bzxn20oexa9k516chk7s";

const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function randomR(len = 6): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

/**
 * Generate a DS header for HoYoLab international game_record endpoints.
 */
export function generateDS(salt: string = SALT_K2): string {
  const t = Math.floor(Date.now() / 1000);
  const r = randomR();
  const h = createHash("md5")
    .update(`salt=${salt}&t=${t}&r=${r}`)
    .digest("hex");
  return `${t},${r},${h}`;
}

/** Headers required alongside DS for game_record API to accept the request. */
export const GAME_RECORD_HEADERS_BASE: Record<string, string> = {
  "x-rpc-app_version": "2.55.0",
  "x-rpc-client_type": "5",
  "x-rpc-language": "en-us",
};
