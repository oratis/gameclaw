import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { listAdapters } from "@/adapters";
import type { GameAdapter } from "@/adapters/types";
import {
  Sparkles,
  Gamepad2,
  Bot,
  Shield,
  ArrowRight,
  CheckCircle2,
  MessageSquarePlus,
  Zap,
} from "lucide-react";

const VENDOR_LABEL: Record<string, string> = {
  hoyoverse: "HoYoLAB · 米游社",
  kuro: "Kurogames · 库街区",
  hypergryph: "Hypergryph · 森空岛",
};

const VENDOR_ACCENT: Record<string, string> = {
  hoyoverse: "#4ECDC4",
  kuro: "#A78BFA",
  hypergryph: "#FBBF24",
};

export default async function Home() {
  const t = await getTranslations("landing");
  const tCommon = await getTranslations("common");

  const adapters = listAdapters();
  const byVendor: Record<string, GameAdapter[]> = {};
  for (const a of adapters) {
    (byVendor[a.vendor] ??= []).push(a);
  }
  const vendorOrder = ["hoyoverse", "kuro", "hypergryph"];

  const features = [
    { icon: Gamepad2, title: t("featureMultiVendor"), desc: t("featureMultiVendorDesc") },
    { icon: Bot, title: t("featureAIDriven"), desc: t("featureAIDrivenDesc") },
    { icon: Sparkles, title: t("featureSkill"), desc: t("featureSkillDesc") },
    { icon: Shield, title: t("featureSecure"), desc: t("featureSecureDesc") },
  ];

  const tiers = [
    { tag: t("tierNowTag"), title: t("tierNowTitle"), desc: t("tierNowDesc"), live: true },
    { tag: t("tierSoonTag"), title: t("tierSoonTitle"), desc: t("tierSoonDesc"), live: false },
    { tag: t("tierFutureTag"), title: t("tierFutureTitle"), desc: t("tierFutureDesc"), live: false },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-20 pt-24 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-emerald-500/10 blur-[120px]" />
        </div>
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" /> {t("badge")}
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            {t("hero")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400">
            {t("heroDesc")}
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
            >
              {t("cta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/demand"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              <MessageSquarePlus className="h-4 w-4" />
              {t("ctaDemand")}
            </Link>
          </div>
          <p className="mt-6 text-xs text-gray-500">
            {t("heroFootnote")}
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-white">
            {t("features")}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <Card key={f.title} className="text-center">
                <f.icon className="mx-auto mb-4 h-10 w-10 text-emerald-400" />
                <h3 className="mb-2 text-lg font-semibold text-white">{f.title}</h3>
                <p className="text-sm text-gray-400">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Tier Roadmap */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-3 text-center text-3xl font-bold text-white">
            {t("tiersTitle")}
          </h2>
          <p className="mb-12 text-center text-gray-400">
            {t("tiersSubtitle")}
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {tiers.map((tier) => (
              <Card
                key={tier.title}
                className={
                  tier.live
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-white/10"
                }
              >
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tier.live ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-gray-400"}`}
                  >
                    {tier.tag}
                  </span>
                  {tier.live && <Zap className="h-4 w-4 text-emerald-400" />}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">{tier.title}</h3>
                <p className="text-sm text-gray-400">{tier.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Games — grouped by vendor, sourced from adapter registry */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-3 text-center text-3xl font-bold text-white">
            {t("supportedGames")}
          </h2>
          <p className="mb-12 text-center text-gray-400">
            {t("supportedGamesSubtitle", { count: adapters.length })}
          </p>

          <div className="space-y-10">
            {vendorOrder.map((vendor) => {
              const list = byVendor[vendor];
              if (!list || list.length === 0) return null;
              const accent = VENDOR_ACCENT[vendor] ?? "#9CA3AF";
              return (
                <div key={vendor}>
                  <div className="mb-4 flex items-center gap-3">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: accent }}
                    />
                    <h3 className="text-sm font-medium uppercase tracking-wider text-gray-400">
                      {VENDOR_LABEL[vendor] ?? vendor}
                    </h3>
                    <span className="text-xs text-gray-600">
                      {list.length} {t("gamesUnit")}
                    </span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((a) => (
                      <Card key={a.slug} className="group">
                        <div className="flex items-start gap-3">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base font-bold"
                            style={{
                              backgroundColor: accent + "20",
                              color: accent,
                            }}
                          >
                            {a.displayName[0]}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate font-semibold text-white">
                              {a.displayName}
                            </h4>
                            <p className="font-mono text-xs text-gray-500">
                              {a.slug}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {a.capabilities.map((c) => (
                                <span
                                  key={c}
                                  className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-400"
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/demand"
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20"
            >
              <MessageSquarePlus className="h-4 w-4" />
              {t("ctaDemandInline")}
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Card className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-400" />
            <h2 className="mb-4 text-2xl font-bold text-white">{t("cta")}</h2>
            <p className="mb-6 text-gray-400">{t("ctaDesc")}</p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
            >
              {tCommon("getStarted")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
        </div>
      </section>
    </div>
  );
}
