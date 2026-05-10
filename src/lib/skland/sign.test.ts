import { describe, it, expect, vi, afterEach } from "vitest";
import { signSklandRequest } from "./sign";

describe("signSklandRequest", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("produces deterministic sign for fixed time / inputs", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T12:00:00Z"));

    const sig = signSklandRequest(
      "test-signing-token",
      "/api/v1/game/player/binding"
    );

    expect(sig.platform).toBe("1");
    expect(sig.vName).toBe("1.21.0");
    expect(sig.dId).toBe("");
    // timestamp = floor(epoch_seconds) - 2 = 1778414400 - 2
    expect(sig.timestamp).toBe(String(1778414400 - 2));
    // sign is MD5(HMAC-SHA256(...)) — deterministic given fixed inputs
    expect(sig.sign).toMatch(/^[a-f0-9]{32}$/);
  });

  it("produces different sign when path differs", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T12:00:00Z"));

    const a = signSklandRequest("k", "/api/v1/a");
    const b = signSklandRequest("k", "/api/v1/b");
    expect(a.sign).not.toBe(b.sign);
  });

  it("produces different sign when body differs", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T12:00:00Z"));

    const a = signSklandRequest("k", "/api/v1/x", '{"gameId":1}');
    const b = signSklandRequest("k", "/api/v1/x", '{"gameId":2}');
    expect(a.sign).not.toBe(b.sign);
  });

  it("produces different sign when key differs", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T12:00:00Z"));

    const a = signSklandRequest("k1", "/api/v1/x");
    const b = signSklandRequest("k2", "/api/v1/x");
    expect(a.sign).not.toBe(b.sign);
  });
});
