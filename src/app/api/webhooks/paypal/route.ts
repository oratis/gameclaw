/**
 * PayPal webhook receiver.
 *
 * Handles subscription lifecycle events:
 *   - BILLING.SUBSCRIPTION.ACTIVATED  → upgrade tier + flip status to active
 *   - BILLING.SUBSCRIPTION.CANCELLED  → downgrade to free + status canceled
 *   - BILLING.SUBSCRIPTION.SUSPENDED  → status past_due (kept on tier briefly)
 *   - BILLING.SUBSCRIPTION.EXPIRED    → downgrade to free + status canceled
 *   - PAYMENT.SALE.COMPLETED          → log only (renewal-period accounting)
 *
 * Idempotent via PayPalWebhookEvent.paypalEventId unique key — replayed events
 * are no-ops.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { verifyWebhookSignature } from "@/lib/billing/paypal";
import { TIERS, type TierId } from "@/lib/billing/tiers";
import { Prisma } from "@prisma/client";

interface PayPalEvent {
  id: string;
  event_type: string;
  resource: {
    id?: string;
    plan_id?: string;
    custom_id?: string;
    status?: string;
    billing_info?: { next_billing_time?: string };
  };
}

function tierFromPlanId(planId: string | undefined): TierId | null {
  if (!planId) return null;
  if (planId === process.env.PAYPAL_PLAN_PRO) return "pro";
  if (planId === process.env.PAYPAL_PLAN_PROPLUS) return "proplus";
  if (planId === process.env.PAYPAL_PLAN_ENTERPRISE) return "enterprise";
  return null;
}

export async function POST(req: NextRequest) {
  const rawText = await req.text();
  let event: PayPalEvent;
  try {
    event = JSON.parse(rawText);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Verify signature. In dev/sandbox, verification can be skipped via env.
  const signatureValid =
    process.env.PAYPAL_VERIFY_WEBHOOKS === "false"
      ? true
      : await verifyWebhookSignature(
          {
            "paypal-auth-algo": req.headers.get("paypal-auth-algo") ?? undefined,
            "paypal-cert-url": req.headers.get("paypal-cert-url") ?? undefined,
            "paypal-transmission-id":
              req.headers.get("paypal-transmission-id") ?? undefined,
            "paypal-transmission-sig":
              req.headers.get("paypal-transmission-sig") ?? undefined,
            "paypal-transmission-time":
              req.headers.get("paypal-transmission-time") ?? undefined,
          },
          event
        );

  if (!signatureValid) {
    logger.warn("paypal webhook signature invalid", { eventId: event.id });
    return NextResponse.json(
      { error: "Signature verification failed" },
      { status: 401 }
    );
  }

  // Idempotency: if we've seen this event ID, return early.
  const existing = await prisma.payPalWebhookEvent.findUnique({
    where: { paypalEventId: event.id },
    select: { id: true, status: true },
  });
  if (existing?.status === "processed") {
    return NextResponse.json({ ok: true, replay: true });
  }

  // Record the event row up front (atomic with idempotency check).
  const eventRow = await prisma.payPalWebhookEvent.upsert({
    where: { paypalEventId: event.id },
    create: {
      paypalEventId: event.id,
      eventType: event.event_type,
      rawBody: event as unknown as Prisma.InputJsonValue,
      status: "received",
    },
    update: {},
  });

  try {
    await handleEvent(event);
    await prisma.payPalWebhookEvent.update({
      where: { id: eventRow.id },
      data: { status: "processed", processedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error("paypal webhook handler failed", e, { eventId: event.id });
    await prisma.payPalWebhookEvent.update({
      where: { id: eventRow.id },
      data: {
        status: "failed",
        errorMessage: e instanceof Error ? e.message : String(e),
      },
    });
    // 500 so PayPal retries.
    return NextResponse.json(
      { error: "Handler failed" },
      { status: 500 }
    );
  }
}

async function handleEvent(event: PayPalEvent): Promise<void> {
  const userId = event.resource.custom_id;
  const subId = event.resource.id;

  switch (event.event_type) {
    case "BILLING.SUBSCRIPTION.ACTIVATED": {
      if (!userId || !subId) return;
      const tier = tierFromPlanId(event.resource.plan_id);
      if (!tier) {
        logger.warn("paypal activated for unknown plan", {
          planId: event.resource.plan_id,
        });
        return;
      }
      const cfg = TIERS[tier];
      const renewsAt = event.resource.billing_info?.next_billing_time
        ? new Date(event.resource.billing_info.next_billing_time)
        : null;
      await prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          tier,
          monthlyTaskQuota: cfg.monthlyTaskQuota,
          monthlyPlanCallQuota: cfg.monthlyPlanCallQuota,
          l3Enabled: cfg.l3Enabled,
          paypalSubscriptionId: subId,
          paypalPlanId: event.resource.plan_id ?? null,
          paypalStatus: event.resource.status ?? "ACTIVE",
          status: "active",
          startedAt: new Date(),
          renewsAt,
        },
        update: {
          tier,
          monthlyTaskQuota: cfg.monthlyTaskQuota,
          monthlyPlanCallQuota: cfg.monthlyPlanCallQuota,
          l3Enabled: cfg.l3Enabled,
          paypalSubscriptionId: subId,
          paypalPlanId: event.resource.plan_id ?? null,
          paypalStatus: event.resource.status ?? "ACTIVE",
          status: "active",
          renewsAt,
        },
      });
      return;
    }

    case "BILLING.SUBSCRIPTION.CANCELLED":
    case "BILLING.SUBSCRIPTION.EXPIRED": {
      if (!subId) return;
      const free = TIERS.free;
      await prisma.subscription.updateMany({
        where: { paypalSubscriptionId: subId },
        data: {
          tier: "free",
          monthlyTaskQuota: free.monthlyTaskQuota,
          monthlyPlanCallQuota: free.monthlyPlanCallQuota,
          l3Enabled: free.l3Enabled,
          paypalStatus: event.resource.status ?? "CANCELLED",
          status: "canceled",
          renewsAt: null,
        },
      });
      return;
    }

    case "BILLING.SUBSCRIPTION.SUSPENDED": {
      if (!subId) return;
      await prisma.subscription.updateMany({
        where: { paypalSubscriptionId: subId },
        data: {
          paypalStatus: event.resource.status ?? "SUSPENDED",
          status: "past_due",
        },
      });
      return;
    }

    default:
      // Unknown / unhandled event type: log only.
      logger.info("paypal webhook ignored", { eventType: event.event_type });
      return;
  }
}
