import { createHmac, createHash } from "node:crypto";
import { SKLAND_VNAME } from "./constants";

export interface SklandSignedHeaders {
  platform: string;
  timestamp: string;
  dId: string;
  vName: string;
  sign: string;
}

/**
 * Skland request signing algorithm.
 *
 * raw = path + query + body + timestamp + headerJson
 * sign = MD5( HMAC-SHA256(raw, key=signingToken) )
 *
 * The header JSON's key order matters — must be platform, timestamp, dId, vName.
 *
 * The 2-second backshift on `timestamp` matches the reference shell implementation
 * and gives a small clock-skew tolerance window.
 */
export function signSklandRequest(
  signingToken: string,
  path: string,
  body = "",
  query = ""
): SklandSignedHeaders {
  const platform = "1";
  const timestamp = String(Math.floor(Date.now() / 1000) - 2);
  const dId = "";
  const vName = SKLAND_VNAME;

  const headerJson = JSON.stringify({ platform, timestamp, dId, vName });
  const raw = path + query + body + timestamp + headerJson;

  const hmac = createHmac("sha256", signingToken).update(raw).digest("hex");
  const sign = createHash("md5").update(hmac).digest("hex");

  return { platform, timestamp, dId, vName, sign };
}
