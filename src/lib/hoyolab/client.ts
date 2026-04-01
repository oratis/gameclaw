import { HOYOLAB_HEADERS } from "./constants";
import type { HoYoLabResponse } from "./types";

export class HoYoLabClient {
  private ltokenV2: string;
  private ltuidV2: string;

  constructor(ltokenV2: string, ltuidV2: string) {
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

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HoYoLab API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
