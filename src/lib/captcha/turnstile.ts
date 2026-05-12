/**
 * Cloudflare Turnstile server-side verification.
 *
 * Fails OPEN when env vars are not configured (so signup works in dev / before
 * Turnstile is set up). Once TURNSTILE_SECRET_KEY is set, verification is
 * enforced.
 *
 * Env:
 *   TURNSTILE_SECRET_KEY              — server secret from Cloudflare Turnstile
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY    — public site key (used by the widget)
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileResult {
  /** True if verification passed OR Turnstile is not configured (fail-open). */
  ok: boolean;
  /** True only if Turnstile was actually called and succeeded. */
  verified: boolean;
  reason?: string;
}

export function isTurnstileEnabled(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY;
}

export async function verifyTurnstileToken(
  token: string | undefined,
  clientIp?: string
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return { ok: true, verified: false, reason: "turnstile disabled" };
  }
  if (!token) {
    return { ok: false, verified: false, reason: "missing token" };
  }

  const params = new URLSearchParams({ secret, response: token });
  if (clientIp) params.append("remoteip", clientIp);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      return { ok: false, verified: false, reason: `HTTP ${res.status}` };
    }
    const data = (await res.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };
    if (data.success) {
      return { ok: true, verified: true };
    }
    return {
      ok: false,
      verified: false,
      reason: (data["error-codes"] ?? ["unknown"]).join(","),
    };
  } catch (e) {
    return {
      ok: false,
      verified: false,
      reason: e instanceof Error ? e.message : "network error",
    };
  }
}
