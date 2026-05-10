import Link from "next/link";
import { auth } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { CheckCircle2, Sparkles, Zap, Building2 } from "lucide-react";
import { TIER_ORDER, TIERS, type TierId } from "@/lib/billing/tiers";

const TIER_ICON: Record<TierId, React.ComponentType<{ className?: string }>> = {
  free: CheckCircle2,
  pro: Zap,
  proplus: Sparkles,
  enterprise: Building2,
};

export const metadata = {
  title: "Pricing — GameClaw",
  description: "Free for casual play. Pro for serious dailies. Pro+ for AI-heavy users. PayPal subscription.",
};

export default async function PricingPage() {
  const session = await auth();
  const isSignedIn = !!session?.user?.id;

  return (
    <div className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">Pricing</h1>
          <p className="mx-auto mt-4 max-w-2xl text-gray-400">
            Pay-as-you-need. Free covers casual daily check-ins. Pro+ unlocks heavy AI Planner usage. All tiers paid via PayPal — global, no card-on-file required.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {TIER_ORDER.map((id) => {
            const tier = TIERS[id];
            const Icon = TIER_ICON[id];
            const highlight = id === "proplus";
            const ctaHref = isSignedIn
              ? id === "free"
                ? "/dashboard"
                : `/settings/billing?upgrade=${id}`
              : `/signup?next=${encodeURIComponent(`/settings/billing?upgrade=${id}`)}`;
            const ctaLabel =
              id === "free"
                ? isSignedIn
                  ? "Open dashboard"
                  : "Start free"
                : id === "enterprise"
                  ? "Contact sales"
                  : "Subscribe";

            return (
              <Card
                key={id}
                className={
                  highlight
                    ? "border-emerald-500/40 bg-emerald-500/5 ring-1 ring-emerald-500/20"
                    : "border-white/10"
                }
              >
                <div className="mb-4 flex items-center gap-2">
                  <Icon className="h-5 w-5 text-emerald-400" />
                  <h2 className="text-lg font-semibold text-white">
                    {tier.displayName}
                  </h2>
                  {highlight && (
                    <span className="ml-auto rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-300">
                      Recommended
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-bold text-white">
                    ${tier.priceMonthly}
                  </span>
                  <span className="ml-1 text-sm text-gray-400">
                    {id === "enterprise" ? "+/mo" : "/mo"}
                  </span>
                </div>

                <p className="mb-5 text-sm text-gray-400">{tier.blurb}</p>

                <ul className="mb-6 space-y-2">
                  {tier.features.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-gray-300"
                    >
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={id === "enterprise" ? "mailto:hello@gogameclaw.com?subject=Enterprise" : ctaHref}
                  className={
                    highlight
                      ? "inline-flex w-full items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
                      : "inline-flex w-full items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
                  }
                >
                  {ctaLabel}
                </Link>
              </Card>
            );
          })}
        </div>

        <div className="mx-auto mt-12 max-w-3xl space-y-3 text-sm text-gray-400">
          <p className="text-center">
            All paid tiers are <span className="text-white">monthly via PayPal</span>. Cancel any time — your tier stays active through the end of the paid period.
          </p>
          <p className="text-center text-xs text-gray-600">
            Note: Pro+&apos;s L3 worker (auto-played副本) is on the M3 roadmap and not yet live. Pro+ today is primarily for users who hit Pro&apos;s 30-call AI Planner limit.
          </p>
        </div>
      </div>
    </div>
  );
}
