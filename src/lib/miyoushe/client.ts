import { MIYOUSHE_HEADERS_BASE } from "./constants";
import type { MiyousheResponse } from "./types";

const COOKIE_VALUE_REGEX = /^[a-zA-Z0-9_\-./=+]+$/;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

export interface MiyousheCredentials {
  /** cookie_token_v2 from miyoushe.com */
  cookieTokenV2: string;
  /** account_id_v2 from miyoushe.com */
  accountIdV2: string;
  /** account_mid_v2 from miyoushe.com (optional, newer accounts have it) */
  accountMidV2?: string;
}

export class MiyousheClient {
  private creds: MiyousheCredentials;
  private signGameHeader?: string;

  constructor(creds: MiyousheCredentials, signGameHeader?: string) {
    for (const [k, v] of Object.entries(creds)) {
      if (v && !COOKIE_VALUE_REGEX.test(v)) {
        throw new Error(`Invalid Miyoushe cookie value for ${k}: contains disallowed characters`);
      }
    }
    if (!creds.cookieTokenV2 || !creds.accountIdV2) {
      throw new Error("Miyoushe requires cookieTokenV2 and accountIdV2");
    }
    this.creds = creds;
    this.signGameHeader = signGameHeader;
  }

  private get cookieHeader(): string {
    const parts = [
      `cookie_token_v2=${this.creds.cookieTokenV2}`,
      `account_id_v2=${this.creds.accountIdV2}`,
    ];
    if (this.creds.accountMidV2) {
      parts.push(`account_mid_v2=${this.creds.accountMidV2}`);
    }
    return parts.join("; ");
  }

  async request<T>(
    url: string,
    method: "GET" | "POST" = "GET",
    body?: Record<string, unknown>
  ): Promise<MiyousheResponse<T>> {
    const headers: Record<string, string> = {
      ...MIYOUSHE_HEADERS_BASE,
      Cookie: this.cookieHeader,
    };

    if (this.signGameHeader) {
      headers["x-rpc-signgame"] = this.signGameHeader;
    }

    if (method === "POST") {
      headers["Content-Type"] = "application/json;charset=UTF-8";
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (response.status >= 500 && attempt < MAX_RETRIES) {
          lastError = new Error(`Miyoushe API error: ${response.status}`);
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }

        if (!response.ok) {
          throw new Error(
            `Miyoushe API error: ${response.status} ${response.statusText}`
          );
        }

        let data: MiyousheResponse<T>;
        try {
          data = (await response.json()) as MiyousheResponse<T>;
        } catch {
          throw new Error("Miyoushe API returned non-JSON response");
        }

        // Rate limiting / risk control
        if (data.retcode === -1002 || data.retcode === -1071) {
          throw new Error(`Rate limited by Miyoushe (code ${data.retcode}). Try again later.`);
        }

        return data;
      } catch (error) {
        if (error instanceof Error && error.name === "TimeoutError") {
          lastError = new Error("Miyoushe API request timed out");
        } else {
          lastError = error instanceof Error ? error : new Error("Unknown error");
        }
        if (attempt < MAX_RETRIES && !lastError.message.includes("Rate limited")) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        throw lastError;
      }
    }

    throw lastError || new Error("Request failed after retries");
  }
}
