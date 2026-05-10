import {
  SKLAND_ATTENDANCE_PATH,
  SKLAND_BASE,
  SKLAND_BINDING_PATH,
  SKLAND_USER_AGENT,
} from "./constants";
import { exchangeSklandCred, hypergryphOAuth } from "./auth";
import { signSklandRequest } from "./sign";
import type {
  SklandAttendanceData,
  SklandBindingData,
  SklandCharacter,
  SklandResponse,
} from "./types";

const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Stateful Skland client. Construct via fromHypergryphToken() — that runs the
 * 2-step auth handshake to obtain cred + signingToken, then keeps them in
 * memory for the lifetime of the instance (typically one task run).
 */
export class SklandClient {
  private cred: string;
  private signingToken: string;

  private constructor(cred: string, signingToken: string) {
    this.cred = cred;
    this.signingToken = signingToken;
  }

  static async fromHypergryphToken(hgToken: string): Promise<SklandClient> {
    const code = await hypergryphOAuth(hgToken);
    const auth = await exchangeSklandCred(code);
    return new SklandClient(auth.cred, auth.token);
  }

  private signedHeaders(path: string, body = "", query = ""): Record<string, string> {
    const sig = signSklandRequest(this.signingToken, path, body, query);
    return {
      "User-Agent": SKLAND_USER_AGENT,
      "Accept-Encoding": "gzip",
      Platform: sig.platform,
      Timestamp: sig.timestamp,
      Did: sig.dId,
      Vname: sig.vName,
      Sign: sig.sign,
      Cred: this.cred,
    };
  }

  private async get<T>(path: string): Promise<SklandResponse<T>> {
    const res = await fetch(`${SKLAND_BASE}${path}`, {
      method: "GET",
      headers: this.signedHeaders(path),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Skland HTTP ${res.status}`);
    return (await res.json()) as SklandResponse<T>;
  }

  private async post<T>(
    path: string,
    body: Record<string, unknown>
  ): Promise<SklandResponse<T>> {
    const bodyStr = JSON.stringify(body);
    const headers = {
      ...this.signedHeaders(path, bodyStr),
      "Content-Type": "application/json",
    };
    const res = await fetch(`${SKLAND_BASE}${path}`, {
      method: "POST",
      headers,
      body: bodyStr,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Skland HTTP ${res.status}`);
    return (await res.json()) as SklandResponse<T>;
  }

  /**
   * Returns all characters across all games bound to this Skland account,
   * flattened (one entry per character/server pair).
   */
  async getBindings(): Promise<SklandCharacter[]> {
    const res = await this.get<SklandBindingData>(SKLAND_BINDING_PATH);
    if (res.code !== 0 || !res.data) {
      throw new Error(`Skland binding query failed: ${res.message ?? "unknown"}`);
    }
    const characters: SklandCharacter[] = [];
    for (const item of res.data.list) {
      for (const ch of item.bindingList) {
        characters.push({
          appCode: item.appCode,
          uid: ch.uid,
          channelMasterId: ch.channelMasterId,
          channelName: ch.channelName,
          nickName: ch.nickName,
        });
      }
    }
    return characters;
  }

  /**
   * Game-side daily attendance. Different from forum/board check-in.
   * The `gameId` field in the body is the character's channelMasterId
   * (i.e. server identifier), not the Skland appCode.
   */
  async attendance(character: SklandCharacter): Promise<SklandResponse<SklandAttendanceData>> {
    return this.post<SklandAttendanceData>(SKLAND_ATTENDANCE_PATH, {
      uid: character.uid,
      gameId: character.channelMasterId,
    });
  }
}
