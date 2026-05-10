import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { TIERS, type TierId } from "@/lib/billing/tiers";
import { currentPeriod } from "@/lib/usage/meter";
import { BillingActions } from "./BillingActions";

export const metadata = {
  title: "Billing — GameClaw",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ upgrade?: string; subscribed?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin?next=/settings/billing");
  }

  const params = await searchParams;
  const upgradeRequested = params.upgrade;
  const justSubscribed = params.subscribed === "1";

  const sub = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });
  const tierId: TierId = (sub?.tier as TierId) ?? "free";
  const tier = TIERS[tierId];

  const period = currentPeriod();
  const meter = await prisma.usageMeter.findUnique({
    where: { userId_period: { userId: session.user.id, period } },
    select: {
      taskCount: true,
      planCallCount: true,
      llmCostUsdMicro: true,
    },
  });

  const taskUsed = meter?.taskCount ?? 0;
  const planUsed = meter?.planCallCount ?? 0;
  const taskLimit = tier.monthlyTaskQuota;
  const planLimit = tier.monthlyPlanCallQuota;
  const llmCostUsd = Number(meter?.llmCostUsdMicro ?? 0n) / 1_000_000;

  function pct(used: number, limit: number): number {
    if (limit === -1) return 0;
    if (limit === 0) return 100;
    return Math.min(100, Math.round((used / limit) * 100));
  }

  function fmt(used: number, limit: number): string {
    if (limit === -1) return `${used.toLocaleString()} (unlimited)`;
    return `${used.toLocaleString()} / ${limit.toLocaleString()}`;
  }

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-2xl font-bold text-white">Billing</h1>
        <p className="mb-8 text-gray-400">Tier and usage for the current month ({period}).</p>

        {justSubscribed && (
          <Card className="mb-6 border-emerald-500/30 bg-emerald-500/5">
            <p className="text-sm text-emerald-300">
              Subscription approved. Your tier will activate within a minute once PayPal confirms.
            </p>
          </Card>
        )}

        <Card className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Current tier
              </p>
              <p className="text-2xl font-bold text-white">{tier.displayName}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">${tier.priceMonthly}/mo</p>
              {sub?.renewsAt && (
                <p className="text-xs text-gray-500">
                  renews {new Date(sub.renewsAt).toLocaleDateString()}
                </p>
              )}
              {sub?.status && sub.status !== "active" && (
                <p className="mt-1 inline-block rounded bg-yellow-500/20 px-1.5 py-0.5 text-[11px] text-yellow-300">
                  {sub.status}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <Usage
              label="Task runs"
              used={taskUsed}
              limit={taskLimit}
              fmt={fmt(taskUsed, taskLimit)}
              pct={pct(taskUsed, taskLimit)}
            />
            <Usage
              label="AI Planner calls"
              used={planUsed}
              limit={planLimit}
              fmt={fmt(planUsed, planLimit)}
              pct={pct(planUsed, planLimit)}
            />
            {llmCostUsd > 0 && (
              <p className="text-xs text-gray-500">
                LLM cost this period: ${llmCostUsd.toFixed(4)}
              </p>
            )}
          </div>
        </Card>

        <BillingActions
          tierId={tierId}
          hasActive={!!sub?.paypalSubscriptionId && sub.status === "active"}
          upgradeRequested={
            upgradeRequested === "pro" ||
            upgradeRequested === "proplus" ||
            upgradeRequested === "enterprise"
              ? upgradeRequested
              : undefined
          }
        />

        <div className="mt-6 flex items-center justify-between text-xs text-gray-500">
          <Link href="/pricing" className="hover:text-gray-300">
            See all tiers →
          </Link>
          <span>billing handled via PayPal</span>
        </div>
      </div>
    </div>
  );
}

function Usage({
  label,
  fmt,
  pct,
}: {
  label: string;
  used: number;
  limit: number;
  fmt: string;
  pct: number;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        <span className="font-mono text-xs text-gray-400">{fmt}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className={
            pct >= 90
              ? "h-full bg-red-500"
              : pct >= 70
                ? "h-full bg-yellow-500"
                : "h-full bg-emerald-500"
          }
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
