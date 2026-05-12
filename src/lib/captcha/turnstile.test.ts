import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isTurnstileEnabled, verifyTurnstileToken } from "./turnstile";

const ORIGINAL_FETCH = globalThis.fetch;

describe("turnstile verify", () => {
  beforeEach(() => {
    delete process.env.TURNSTILE_SECRET_KEY;
  });
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    delete process.env.TURNSTILE_SECRET_KEY;
  });

  it("isTurnstileEnabled reflects env var presence", () => {
    expect(isTurnstileEnabled()).toBe(false);
    process.env.TURNSTILE_SECRET_KEY = "secret";
    expect(isTurnstileEnabled()).toBe(true);
  });

  it("fails OPEN when TURNSTILE_SECRET_KEY is unset (dev / pre-launch)", async () => {
    const res = await verifyTurnstileToken("any-token");
    expect(res.ok).toBe(true);
    expect(res.verified).toBe(false);
    expect(res.reason).toMatch(/disabled/i);
  });

  it("fails closed when secret is set but token is missing", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret";
    const res = await verifyTurnstileToken(undefined);
    expect(res.ok).toBe(false);
    expect(res.verified).toBe(false);
    expect(res.reason).toMatch(/missing/i);
  });

  it("returns verified when Cloudflare responds success", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret";
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }) as unknown as typeof fetch;

    const res = await verifyTurnstileToken("good-token", "1.2.3.4");
    expect(res.ok).toBe(true);
    expect(res.verified).toBe(true);
  });

  it("propagates Cloudflare error-codes when verification fails", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret";
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: false,
        "error-codes": ["invalid-input-response"],
      }),
    }) as unknown as typeof fetch;

    const res = await verifyTurnstileToken("bad-token");
    expect(res.ok).toBe(false);
    expect(res.verified).toBe(false);
    expect(res.reason).toContain("invalid-input-response");
  });

  it("surfaces non-2xx HTTP responses as failures", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret";
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    const res = await verifyTurnstileToken("token");
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("502");
  });
});
