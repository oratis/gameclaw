/**
 * User-notification scaffolding.
 *
 * Provider-agnostic: each channel is enabled by env vars, fail-silent if
 * unconfigured. v0 supports Discord webhook + Resend email. Both are env-only
 * — no per-user notification preferences yet (next iteration).
 *
 * Env:
 *   NOTIFY_DISCORD_WEBHOOK_URL    Discord channel webhook for global ops alerts
 *   NOTIFY_RESEND_API_KEY         Resend API key (resend.com) for transactional email
 *   NOTIFY_RESEND_FROM            From: address (e.g. "GameClaw <noreply@gogameclaw.com>")
 *   NOTIFY_ADMIN_EMAILS           Comma-separated, mirrors ADMIN_EMAILS for ops alerts
 *
 * Used by failure-detection cron and the future cron-summary digest. NOT
 * called from user-facing routes — keep notifications async + idempotent.
 */

import { logger } from "@/lib/logger";

interface NotifyResult {
  channel: string;
  ok: boolean;
  error?: string;
}

export interface NotifyPayload {
  /** "GameClaw daily-cron failures spiked", etc. */
  title: string;
  /** Markdown body — used by Discord and email both. */
  body: string;
  /** Severity tag — drives Discord color, email subject prefix. */
  severity?: "info" | "warning" | "error";
  /** Optional URL to surface in the message. */
  url?: string;
}

const SEV_COLOR: Record<string, number> = {
  info: 0x4ecdc4,
  warning: 0xfbbf24,
  error: 0xef4444,
};
const SEV_PREFIX: Record<string, string> = {
  info: "ℹ️",
  warning: "⚠️",
  error: "❌",
};

async function notifyDiscord(p: NotifyPayload): Promise<NotifyResult> {
  const url = process.env.NOTIFY_DISCORD_WEBHOOK_URL;
  if (!url) return { channel: "discord", ok: false, error: "not configured" };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: `${SEV_PREFIX[p.severity ?? "info"]} ${p.title}`,
            description: p.body,
            color: SEV_COLOR[p.severity ?? "info"],
            url: p.url,
            timestamp: new Date().toISOString(),
            footer: { text: "GameClaw ops" },
          },
        ],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return {
        channel: "discord",
        ok: false,
        error: `${res.status} ${res.statusText}`,
      };
    }
    return { channel: "discord", ok: true };
  } catch (e) {
    return { channel: "discord", ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

async function notifyEmail(
  p: NotifyPayload,
  to: string[]
): Promise<NotifyResult> {
  const apiKey = process.env.NOTIFY_RESEND_API_KEY;
  const from = process.env.NOTIFY_RESEND_FROM;
  if (!apiKey || !from || to.length === 0) {
    return { channel: "email", ok: false, error: "not configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: `${SEV_PREFIX[p.severity ?? "info"]} ${p.title}`,
        text: p.body + (p.url ? `\n\n${p.url}` : ""),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      return {
        channel: "email",
        ok: false,
        error: `${res.status} ${res.statusText}`,
      };
    }
    return { channel: "email", ok: true };
  } catch (e) {
    return { channel: "email", ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

function adminEmails(): string[] {
  const raw =
    process.env.NOTIFY_ADMIN_EMAILS ?? process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Fire to all configured channels in parallel. Returns per-channel result
 * but NEVER throws — callers can fire-and-forget.
 */
export async function notifyAdmins(p: NotifyPayload): Promise<NotifyResult[]> {
  const [discord, email] = await Promise.all([
    notifyDiscord(p),
    notifyEmail(p, adminEmails()),
  ]);
  const results = [discord, email];
  const sent = results.filter((r) => r.ok).map((r) => r.channel);
  if (sent.length > 0) {
    logger.info("notifyAdmins sent", { channels: sent, title: p.title });
  }
  return results;
}

/**
 * Fire to a specific user's email (when we add per-user prefs).
 */
export async function notifyUser(
  email: string | null,
  p: NotifyPayload
): Promise<NotifyResult[]> {
  if (!email) return [];
  const result = await notifyEmail(p, [email]);
  return [result];
}
