/**
 * Lightweight PayPal REST client (Subscriptions API).
 *
 * We only need the Billing/Subscriptions endpoints — Anthropic-grade SDK is
 * overkill. Uses OAuth2 client_credentials grant for auth.
 *
 * Required env:
 *   PAYPAL_CLIENT_ID        — public client ID (sandbox or live)
 *   PAYPAL_CLIENT_SECRET    — secret (rotate on leak)
 *   PAYPAL_ENV              — "sandbox" | "live" (default sandbox)
 *   PAYPAL_WEBHOOK_ID       — used for webhook signature verification
 *
 * Optional (per-tier plan IDs — set after creating plans in PayPal dashboard):
 *   PAYPAL_PLAN_PRO         — Pro tier plan ID
 *   PAYPAL_PLAN_PROPLUS     — Pro+ tier plan ID
 *   PAYPAL_PLAN_ENTERPRISE  — Enterprise tier plan ID
 */

const SANDBOX_BASE = "https://api-m.sandbox.paypal.com";
const LIVE_BASE = "https://api-m.paypal.com";

function apiBase(): string {
  return process.env.PAYPAL_ENV === "live" ? LIVE_BASE : SANDBOX_BASE;
}

export class PayPalClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown
  ) {
    super(message);
    this.name = "PayPalClientError";
  }
}

interface AccessTokenCacheEntry {
  token: string;
  /** Epoch ms when this token expires. */
  expiresAt: number;
}

let _tokenCache: AccessTokenCacheEntry | null = null;

async function getAccessToken(): Promise<string> {
  if (_tokenCache && _tokenCache.expiresAt > Date.now() + 60_000) {
    return _tokenCache.token;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new PayPalClientError(
      "PayPal not configured (missing PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET)",
      500
    );
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new PayPalClientError(
      `PayPal OAuth2 token request failed: ${res.status}`,
      res.status,
      text
    );
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  _tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

interface RequestOpts {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  headers?: Record<string, string>;
}

async function paypalRequest<T = unknown>(
  path: string,
  opts: RequestOpts = {}
): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${apiBase()}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...opts.headers,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new PayPalClientError(
      `PayPal ${opts.method ?? "GET"} ${path} failed: ${res.status}`,
      res.status,
      text
    );
  }

  if (res.status === 204) return {} as T;
  return (await res.json()) as T;
}

/* ---------------- Subscriptions API ---------------- */

export interface CreateSubscriptionInput {
  planId: string;
  /** Pass-through metadata sent to PayPal (subscriber object) */
  subscriber?: { email_address?: string; name?: { given_name?: string; surname?: string } };
  /** Where PayPal redirects after approval. Required. */
  returnUrl: string;
  cancelUrl: string;
  /** Custom string round-tripped via webhooks (we use it for our user ID). */
  customId: string;
}

export interface CreatedSubscription {
  id: string;
  status: string;
  /** URL the user must visit to approve the subscription. */
  approvalUrl: string;
}

export async function createSubscription(
  input: CreateSubscriptionInput
): Promise<CreatedSubscription> {
  const body = {
    plan_id: input.planId,
    custom_id: input.customId,
    subscriber: input.subscriber,
    application_context: {
      brand_name: "GameClaw",
      user_action: "SUBSCRIBE_NOW",
      return_url: input.returnUrl,
      cancel_url: input.cancelUrl,
    },
  };
  const data = await paypalRequest<{
    id: string;
    status: string;
    links: Array<{ rel: string; href: string; method: string }>;
  }>("/v1/billing/subscriptions", { method: "POST", body });

  const approveLink = data.links.find((l) => l.rel === "approve");
  if (!approveLink) {
    throw new PayPalClientError(
      "PayPal did not return an approve link",
      500,
      data
    );
  }

  return {
    id: data.id,
    status: data.status,
    approvalUrl: approveLink.href,
  };
}

export async function getSubscription(subscriptionId: string): Promise<{
  id: string;
  status: string;
  plan_id: string;
  custom_id?: string;
  billing_info?: { next_billing_time?: string };
}> {
  return paypalRequest(`/v1/billing/subscriptions/${subscriptionId}`);
}

export async function cancelSubscription(
  subscriptionId: string,
  reason: string
): Promise<void> {
  await paypalRequest(`/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    body: { reason },
  });
}

/* ---------------- Webhook signature verification ---------------- */

export interface WebhookHeaders {
  "paypal-auth-algo"?: string;
  "paypal-cert-url"?: string;
  "paypal-transmission-id"?: string;
  "paypal-transmission-sig"?: string;
  "paypal-transmission-time"?: string;
}

/**
 * Verify a PayPal webhook event using PayPal's verify-webhook-signature endpoint.
 * Returns true if PayPal confirms the signature is valid.
 *
 * If PAYPAL_WEBHOOK_ID is unset, returns false (treat as un-trusted).
 */
export async function verifyWebhookSignature(
  headers: WebhookHeaders,
  rawBody: unknown
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;

  const required: Array<keyof WebhookHeaders> = [
    "paypal-auth-algo",
    "paypal-cert-url",
    "paypal-transmission-id",
    "paypal-transmission-sig",
    "paypal-transmission-time",
  ];
  for (const k of required) {
    if (!headers[k]) return false;
  }

  try {
    const data = await paypalRequest<{ verification_status: string }>(
      "/v1/notifications/verify-webhook-signature",
      {
        method: "POST",
        body: {
          auth_algo: headers["paypal-auth-algo"],
          cert_url: headers["paypal-cert-url"],
          transmission_id: headers["paypal-transmission-id"],
          transmission_sig: headers["paypal-transmission-sig"],
          transmission_time: headers["paypal-transmission-time"],
          webhook_id: webhookId,
          webhook_event: rawBody,
        },
      }
    );
    return data.verification_status === "SUCCESS";
  } catch {
    return false;
  }
}
