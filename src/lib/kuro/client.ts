import { KURO_API_BASE, KURO_HEADERS } from "./constants";
import type { KuroResponse } from "./types";

const TOKEN_REGEX = /^[A-Za-z0-9._\-]+$/;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

function generateDevCode(): string {
  const arr = new Uint8Array(20);
  globalThis.crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export class KuroClient {
  private token: string;
  private devCode: string;

  constructor(token: string, devCode?: string) {
    if (!token || !TOKEN_REGEX.test(token)) {
      throw new Error("Invalid Kuro token: empty or contains disallowed characters");
    }
    this.token = token;
    this.devCode = devCode ?? generateDevCode();
  }

  async post<T>(
    path: string,
    body: Record<string, string | number>
  ): Promise<KuroResponse<T>> {
    const url = path.startsWith("http") ? path : `${KURO_API_BASE}${path}`;

    const headers: Record<string, string> = {
      ...KURO_HEADERS,
      devCode: this.devCode,
      token: this.token,
    };

    const formBody = new URLSearchParams();
    for (const [k, v] of Object.entries(body)) {
      formBody.append(k, String(v));
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: formBody.toString(),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (response.status >= 500 && attempt < MAX_RETRIES) {
          lastError = new Error(`Kuro API error: ${response.status}`);
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }

        if (!response.ok) {
          throw new Error(
            `Kuro API error: ${response.status} ${response.statusText}`
          );
        }

        let data: KuroResponse<T>;
        try {
          data = (await response.json()) as KuroResponse<T>;
        } catch {
          throw new Error("Kuro API returned non-JSON response");
        }

        // 220 = token expired. Surface clearly so caller can prompt re-link.
        if (data.code === 220) {
          throw new Error("Kuro token expired (code 220)");
        }

        return data;
      } catch (error) {
        if (error instanceof Error && error.name === "TimeoutError") {
          lastError = new Error("Kuro API request timed out");
        } else {
          lastError = error instanceof Error ? error : new Error("Unknown error");
        }
        const msg = lastError.message;
        // Don't retry on auth failure
        if (msg.includes("token expired")) throw lastError;
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        throw lastError;
      }
    }

    throw lastError || new Error("Request failed after retries");
  }
}
