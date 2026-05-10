/**
 * Start a PayPal subscription for the requested tier.
 *
 * POST { tier: "pro" | "proplus" | "enterprise" }
 * → { approvalUrl, paypalSubscriptionId }
 *
 * The user is redirected to approvalUrl to complete payment in PayPal.
 * On approval, PayPal redirects them to /settings/billing?subscribed=1.
 * The actual tier upgrade happens in the webhook handler when PayPal sends
 * BILLING.SUBSCRIPTION.ACTIVATED.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSubscription, PayPalClientError } from "@/lib/billing/paypal";
import { paypalPlanIdForTier, TIERS, type TierId } from "@/lib/billing/tiers";

const ALLOWED_TIERS: TierId[] = ["pro", "proplus", "enterprise"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { tier?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tier = body.tier as TierId;
  if (!ALLOWED_TIERS.includes(tier)) {
    return NextResponse.json(
      { error: "tier must be one of: " + ALLOWED_TIERS.join(", ") },
      { status: 400 }
    );
  }

  const planId = paypalPlanIdForTier(tier);
  if (!planId) {
    return NextResponse.json(
      {
        error: `${TIERS[tier].displayName} tier is not yet configured (missing PAYPAL_PLAN_${tier.toUpperCase()})`,
      },
      { status: 503 }
    );
  }

  const origin = req.headers.get("origin") ?? "https://gogameclaw.com";

  try {
    const sub = await createSubscription({
      planId,
      customId: session.user.id,
      subscriber: session.user.email
        ? { email_address: session.user.email }
        : undefined,
      returnUrl: `${origin}/settings/billing?subscribed=1`,
      cancelUrl: `${origin}/pricing?cancelled=1`,
    });

    // Persist the pending subscription. Tier is NOT upgraded yet — only
    // happens in the webhook on ACTIVATED.
    await prisma.subscription.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        tier: "free",
        paypalSubscriptionId: sub.id,
        paypalPlanId: planId,
        paypalStatus: sub.status,
        status: "pending",
      },
      update: {
        paypalSubscriptionId: sub.id,
        paypalPlanId: planId,
        paypalStatus: sub.status,
        status: "pending",
      },
    });

    return NextResponse.json({
      paypalSubscriptionId: sub.id,
      approvalUrl: sub.approvalUrl,
    });
  } catch (e) {
    if (e instanceof PayPalClientError) {
      return NextResponse.json(
        { error: `PayPal API error: ${e.message}`, status: e.status },
        { status: 502 }
      );
    }
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Subscription creation failed",
      },
      { status: 500 }
    );
  }
}
