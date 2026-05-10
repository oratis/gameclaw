/**
 * Cancel the current user's PayPal subscription.
 *
 * POST → { ok: true }
 *
 * The actual tier downgrade happens in the webhook on
 * BILLING.SUBSCRIPTION.CANCELLED, which fires shortly after this returns.
 * We optimistically mark the local row as "canceling" right away so the
 * user sees the change in the UI without waiting on the webhook.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  cancelSubscription,
  PayPalClientError,
} from "@/lib/billing/paypal";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
    select: { paypalSubscriptionId: true, status: true },
  });

  if (!sub?.paypalSubscriptionId) {
    return NextResponse.json(
      { error: "No active subscription to cancel" },
      { status: 404 }
    );
  }

  try {
    await cancelSubscription(sub.paypalSubscriptionId, "User-initiated cancel");
    await prisma.subscription.update({
      where: { userId: session.user.id },
      data: { status: "canceling" },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof PayPalClientError) {
      return NextResponse.json(
        { error: `PayPal API error: ${e.message}` },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Cancel failed" },
      { status: 500 }
    );
  }
}
