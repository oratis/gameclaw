/**
 * AI weekly reporter — Markdown digest of the user's last 7 days of activity.
 *
 * Free tier: 1 report per month (read-on-demand).
 * Pro+: unlimited reads (each costs ~$0.001 Haiku).
 *
 * No persistence in v0 — regenerates on each call. Future: cache by
 * (userId, week) so repeated views don't re-spend tokens.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateReport, lastNDaysWindow } from "@/lib/reporter/reporter";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const days = Math.min(
    Math.max(parseInt(url.searchParams.get("days") || "7", 10) || 7, 1),
    30
  );
  const locale = url.searchParams.get("locale") || undefined;

  try {
    const out = await generateReport(
      session.user.id,
      lastNDaysWindow(days),
      locale
    );
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Reporter failed" },
      { status: 500 }
    );
  }
}
