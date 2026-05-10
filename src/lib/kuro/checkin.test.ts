import { describe, it, expect, vi, afterEach } from "vitest";
import { performKuroCheckin, getKuroRoles } from "./checkin";
import type { KuroRole } from "./types";

function mockJsonResponse(body: unknown, opts: { status?: number; ok?: boolean } = {}) {
  return {
    ok: opts.ok ?? true,
    status: opts.status ?? 200,
    statusText: "OK",
    json: async () => body,
  } as unknown as Response;
}

const TEST_TOKEN = "eyJhbGciOiJIUzI1NiJ9.test.signature";

const ROLE: KuroRole = {
  serverId: "76402e5b20be2c39f095a152090afddc",
  serverName: "亚洲服",
  roleId: "100000001",
  userId: 12345678,
  gameId: 3,
};

describe("performKuroCheckin", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns success on code 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        // sign
        .mockResolvedValueOnce(mockJsonResponse({ code: 200, msg: "OK", data: null }))
        // queryRecord
        .mockResolvedValueOnce(
          mockJsonResponse({
            code: 200,
            msg: "OK",
            data: [{ goodsName: "星声" }],
          })
        )
    );

    const result = await performKuroCheckin(TEST_TOKEN, "wuwa", ROLE);
    expect(result.success).toBe(true);
    expect(result.status).toBe("success");
    expect(result.reward).toBe("星声");
  });

  it("returns already_claimed on duplicate-sign message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        mockJsonResponse({ code: 1511, msg: "今天已经签过了", data: null })
      )
    );

    const result = await performKuroCheckin(TEST_TOKEN, "wuwa", ROLE);
    expect(result.success).toBe(true);
    expect(result.status).toBe("already_claimed");
  });

  it("returns failed on unknown business error", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          mockJsonResponse({ code: 500, msg: "服务器错误", data: null })
        )
    );

    const result = await performKuroCheckin(TEST_TOKEN, "wuwa", ROLE);
    expect(result.success).toBe(false);
    expect(result.status).toBe("failed");
  });
});

describe("getKuroRoles", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns roles array on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        mockJsonResponse({
          code: 200,
          msg: "OK",
          data: [ROLE],
        })
      )
    );

    const roles = await getKuroRoles(TEST_TOKEN, "wuwa");
    expect(roles).toHaveLength(1);
    expect(roles[0].roleId).toBe("100000001");
  });

  it("returns empty array when API responds with non-200 code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        mockJsonResponse({ code: 1001, msg: "no roles", data: [] })
      )
    );

    const roles = await getKuroRoles(TEST_TOKEN, "wuwa");
    expect(roles).toEqual([]);
  });
});
