import { HOYOLAB_HEADERS } from "./constants";
import type { HoYoLabResponse } from "./types";

const COOKIE_VALUE_REGEX = /^[a-zA-Z0-9_\-./=+]+$/;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

export class HoYoLabClient {
  private ltokenV2: string;
  private ltuidV2: string;

  constructor(ltokenV2: string, ltuidV2: string) {
    if (!COOKIE_VALUE_REGEX.test(ltokenV2) || !COOKIE_VALUE_REGEX.test(ltuidV2)) {
      throw new Error("Invalid cookie value: contains disallowed characters");
    }
    this.ltokenV2 = ltokenV2;
    this.ltuidV2 = ltuidV2;
  }

  private get cookieHeader(): string {
    return `ltoken_v2=${this.ltokenV2}; ltuid_v2=${this.ltuidV2}`;
  }

  async request<T>(
    url: string,
    method: "GET" | "POST" = "GET",
    body?: Record<string, unknown>
  ): Promise<HoYoLabResponse<T>> {
    const headers: Record<string, string> = {
      ...HOYOLAB_HEADERS,
      Cookie: this.cookieHeader,
    };

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
          lastError = new Error(`HoYoLab API error: ${response.status}`);
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }

        if (!response.ok) {
          throw new Error(`HoYoLab API error: ${response.status} ${response.statusText}`);
        }

        let data: HoYoLabResponse<T>;
        try {
          data = await response.json();
        } catch {
          throw new Error("HoYoLab API returned non-JSON response");
        }

        // Handle rate limiting
        if (data.retcode === -1002 || data.retcode === -1071) {
          throw new Error(`Rate limited by HoYoLab (code ${data.retcode}). Try again later.`);
        }

        return data;
      } catch (error) {
        if (error instanceof Error && error.name === "TimeoutError") {
          lastError = new Error("HoYoLab API request timed out");
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
