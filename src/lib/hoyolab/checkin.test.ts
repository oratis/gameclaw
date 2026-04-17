import { describe, it, expect, vi, afterEach } from "vitest";
import { performCheckin, getCheckinInfo } from "./checkin";

function mockFetchResponse(body: unknown, opts: { status?: number; ok?: boolean } = {}) {
  return {
    ok: opts.ok ?? true,
    status: opts.status ?? 200,
    statusText: "OK",
    json: async () => body,
  } as unknown as Response;
}

describe("performCheckin", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns success on retcode 0", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockFetchResponse({ retcode: 0, message: "OK", data: null })
      )
    );

    const result = await performCheckin("genshin", "validToken", "12345");
    expect(result.success).toBe(true);
    expect(result.status).toBe("success");
    expect(result.message).toContain("Genshin Impact");
  });

  it("returns already_claimed on retcode -5003", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockFetchResponse({ retcode: -5003, message: "already", data: null })
      )
    );

    const result = await performCheckin("starrail", "validToken", "12345");
    expect(result.success).toBe(true);
    expect(result.status).toBe("already_claimed");
  });

  it("returns failed on unknown retcode", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockFetchResponse({ retcode: -999, message: "Unknown error", data: null })
      )
    );

    const result = await performCheckin("zzz", "validToken", "12345");
    expect(result.success).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.message).toBe("Unknown error");
  });

  it("returns failed on unknown game slug", async () => {
    const result = await performCheckin(
      "nonexistent" as never,
      "validToken",
      "12345"
    );
    expect(result.success).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.message).toContain("Unknown game");
  });

  it("returns failed on rate limit retcode -1002", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockFetchResponse({ retcode: -1002, message: "rate limited", data: null })
      )
    );

    const result = await performCheckin("genshin", "validToken", "12345");
    expect(result.success).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.message).toMatch(/rate.?limit/i);
  });

  it("returns failed on network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network failure"))
    );

    const result = await performCheckin("genshin", "validToken", "12345");
    expect(result.success).toBe(false);
    expect(result.status).toBe("failed");
  });

  it("rejects invalid cookie values before making request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await performCheckin("genshin", "token; injected=1", "12345");
    expect(result.success).toBe(false);
    expect(result.status).toBe("failed");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("getCheckinInfo", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns data on success", async () => {
    const mockData = {
      total_sign_day: 5,
      today: "2026-04-17",
      is_sign: true,
      first_bind: false,
      is_sub: false,
      region: "os_usa",
      month_last_day: false,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockFetchResponse({ retcode: 0, message: "OK", data: mockData })
      )
    );

    const info = await getCheckinInfo("genshin", "validToken", "12345");
    expect(info).toEqual(mockData);
  });

  it("returns null on error retcode", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockFetchResponse({ retcode: -100, message: "invalid", data: null })
      )
    );

    const info = await getCheckinInfo("genshin", "validToken", "12345");
    expect(info).toBeNull();
  });

  it("returns null on network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    const info = await getCheckinInfo("genshin", "validToken", "12345");
    expect(info).toBeNull();
  });

  it("returns null on unknown game", async () => {
    const info = await getCheckinInfo("unknown" as never, "token", "uid");
    expect(info).toBeNull();
  });
});
