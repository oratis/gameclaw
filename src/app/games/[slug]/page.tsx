import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { getAdapter, hasAdapter, listAdapters } from "@/adapters";
import { ArrowRight, CheckCircle2, Shield, Zap, KeyRound, Bot } from "lucide-react";
import type { Metadata } from "next";

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

export function generateStaticParams() {
  return listAdapters().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const adapter = getAdapter(slug);
  if (!adapter) return {};
  return {
    title: `${adapter.displayName} — Auto Daily Check-in`,
    description: `Automate ${adapter.displayName} daily rewards with GameClaw. Capabilities: ${adapter.capabilities.join(", ")}.`,
    openGraph: {
      title: `${adapter.displayName} | GameClaw`,
      description: `Daily check-in and beyond for ${adapter.displayName}, powered by AI.`,
    },
  };
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!hasAdapter(slug)) notFound();

  const t = await getTranslations("games");
  const tCommon = await getTranslations("common");

  const adapter = getAdapter(slug)!;
  const accent = VENDOR_ACCENT[adapter.vendor] ?? "#9CA3AF";
  const vendorLabel = VENDOR_LABEL[adapter.vendor] ?? adapter.vendor;

  const features = [
    { icon: Zap, label: t("featDaily"), desc: t("featDailyDesc") },
    { icon: Shield, label: t("featSecure"), desc: t("featSecureDesc") },
    { icon: Bot, label: t("featAI"), desc: t("featAIDesc") },
  ];

  return (
    <div className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Hero */}
        <div className="mb-16 text-center">
          <div
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl text-4xl font-bold"
            style={{ backgroundColor: accent + "20", color: accent }}
          >
            {adapter.displayName[0]}
          </div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
            {vendorLabel}
          </p>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            {adapter.displayName}
          </h1>
          <p className="mt-3 font-mono text-sm text-gray-500">{adapter.slug}</p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
            >
              {t("linkAccount")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              {tCommon("docs")}
            </Link>
          </div>
        </div>

        {/* Capabilities */}
        <section className="mb-16">
          <h2 className="mb-2 text-2xl font-bold text-white">{t("capabilities")}</h2>
          <p className="mb-6 text-sm text-gray-400">{t("capabilitiesDesc")}</p>
          <div className="flex flex-wrap gap-2">
            {adapter.capabilities.map((c) => (
              <span
                key={c}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-gray-300"
              >
                {c}
              </span>
            ))}
          </div>
        </section>

        {/* Credentials */}
        <section className="mb-16">
          <h2 className="mb-2 text-2xl font-bold text-white">
            {t("credsTitle")}
          </h2>
          <p className="mb-6 text-sm text-gray-400">{t("credsDesc")}</p>
          <div className="space-y-3">
            {adapter.credentialFields.map((f) => (
              <Card key={f.key} className="flex items-center gap-4">
                <KeyRound className="h-5 w-5 text-emerald-400" />
                <div className="flex-1">
                  <p className="font-mono text-sm text-white">{f.label}</p>
                  <p className="text-xs text-gray-500">
                    auth = {adapter.authMethod}
                    {f.required ? "" : " · optional"}
                    {f.sensitive ? " · sensitive" : ""}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mb-16">
          <h2 className="mb-8 text-2xl font-bold text-white">{t("features")}</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((f) => (
              <Card key={f.label}>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                  <f.icon className="h-5 w-5 text-emerald-400" />
                </div>
                <h3 className="mb-1 text-sm font-semibold text-white">
                  {f.label}
                </h3>
                <p className="text-sm text-gray-400">{f.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <Card className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-emerald-400" />
          <h2 className="mb-3 text-xl font-bold text-white">
            {t("ctaTitle", { game: adapter.displayName })}
          </h2>
          <p className="mb-5 text-sm text-gray-400">{t("ctaDesc")}</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
          >
            {t("linkAccount")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </div>
    </div>
  );
}
