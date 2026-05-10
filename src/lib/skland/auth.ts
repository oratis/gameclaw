import {
  HYPERGRYPH_BASE,
  HYPERGRYPH_OAUTH_PATH,
  SKLAND_APP_CODE,
  SKLAND_AUTH_PATH,
  SKLAND_BASE,
  SKLAND_USER_AGENT,
} from "./constants";
import type { HypergryphAuthResponse, SklandAuthData, SklandResponse } from "./types";

const HG_TOKEN_REGEX = /^[A-Za-z0-9._\-=+]+$/;

/**
 * Step 1 of Skland auth: exchange a Hypergryph user token for a one-time
 * Skland authorization code. The user's Hypergryph token is the long-lived
 * persistent secret we ask the user to provide.
 */
export async function hypergryphOAuth(hgToken: string): Promise<string> {
  if (!hgToken || !HG_TOKEN_REGEX.test(hgToken)) {
    throw new Error("Invalid Hypergryph token");
  }

  const res = await fetch(`${HYPERGRYPH_BASE}${HYPERGRYPH_OAUTH_PATH}`, {
    method: "POST",
    headers: {
      "User-Agent": SKLAND_USER_AGENT,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ appCode: SKLAND_APP_CODE, token: hgToken, type: 0 }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`Hypergryph OAuth HTTP ${res.status}`);
  }

  const data = (await res.json()) as HypergryphAuthResponse;
  if (data.status !== 0 || !data.data?.code) {
    throw new Error(`Hypergryph OAuth failed: ${data.msg ?? "unknown error"}`);
  }
  return data.data.code;
}

/**
 * Step 2: trade the Skland code for a (cred, signingToken) pair.
 * `cred` is sent as the Cred header on subsequent calls; `signingToken`
 * is the HMAC key for request signing.
 */
export async function exchangeSklandCred(code: string): Promise<SklandAuthData> {
  const res = await fetch(`${SKLAND_BASE}${SKLAND_AUTH_PATH}`, {
    method: "POST",
    headers: {
      "User-Agent": SKLAND_USER_AGENT,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code, kind: 1 }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`Skland auth HTTP ${res.status}`);
  }

  const data = (await res.json()) as SklandResponse<SklandAuthData>;
  if (data.code !== 0 || !data.data) {
    throw new Error(`Skland auth failed: ${data.message ?? data.msg ?? "unknown"}`);
  }
  return data.data;
}
