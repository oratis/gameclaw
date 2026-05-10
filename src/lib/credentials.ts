/**
 * Bridges Prisma's GameAccount row → adapter Credentials map.
 *
 * Reading order:
 *   1. account.credentials (encrypted JSON)  — new, generic, supports any adapter
 *   2. account.ltokenV2 + account.ltuidV2     — legacy HoYoLab-only, decrypted into a 2-key map
 *
 * Writing: always use account.credentials (encryptJSON of the Credentials map).
 * The legacy columns are retained so existing rows keep working without migration.
 */

import { decrypt, decryptJSON, encryptJSON } from "./encryption";
import type { Credentials } from "@/adapters/types";
import type { GameAccount } from "@prisma/client";

export function buildCreds(account: GameAccount): Credentials {
  if (account.credentials) {
    return decryptJSON<Credentials>(account.credentials);
  }
  if (account.ltokenV2 && account.ltuidV2) {
    return {
      ltokenV2: decrypt(account.ltokenV2),
      ltuidV2: decrypt(account.ltuidV2),
    };
  }
  throw new Error("GameAccount has no stored credentials");
}

export function packCreds(creds: Credentials): string {
  return encryptJSON(creds);
}
