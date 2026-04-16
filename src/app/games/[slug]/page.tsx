import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { GAMES, GAME_SLUGS } from "@/lib/hoyolab/constants";
import type { GameSlug } from "@/types/games";
import { ArrowRight, CheckCircle2, Users, Zap } from "lucide-react";
import type { Metadata } from "next";

export function generateStaticParams() {
  return GAME_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!(slug in GAMES)) return {};
  const game = GAMES[slug as GameSlug];
  return {
    title: `${game.name} - Auto Daily Check-in`,
    description: `Automate ${game.name} daily check-in on HoYoLAB. ${game.description}`,
    openGraph: {
      title: `${game.name} - GameClaw Auto Check-in`,
      description: `Never miss a ${game.name} daily check-in again. Automatically claim rewards with GameClaw.`,
    },
  };
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("games");

  if (!(slug in GAMES)) notFound();

  const game = GAMES[slug as GameSlug];
  const gameT = t.raw(slug) as Record<string, string>;

  const featureIcons = [Zap, CheckCircle2, Users];

  return (
    <div className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Hero */}
        <div className="mb-16 text-center">
          <div
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl text-4xl font-bold"
            style={{ backgroundColor: game.color + "20", color: game.color }}
          >
            {game.name[0]}
          </div>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">{gameT.title}</h1>
          <p className="mt-3 text-lg text-gray-400">{gameT.tagline}</p>
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
              {t("viewDetails")}
            </Link>
          </div>
        </div>

        {/* Features */}
        <section className="mb-16">
          <h2 className="mb-8 text-2xl font-bold text-white">{t("features")}</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {["feature1", "feature2", "feature3"].map((key, i) => {
              const Icon = featureIcons[i];
              return (
                <Card key={key}>
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                    <Icon className="h-5 w-5 text-emerald-400" />
                  </div>
                  <p className="text-sm text-gray-300">{gameT[key]}</p>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Use Cases */}
        <section className="mb-16">
          <h2 className="mb-8 text-2xl font-bold text-white">{t("useCases")}</h2>
          <div className="space-y-4">
            {["useCase1", "useCase2", "useCase3"].map((key) => (
              <Card key={key} className="flex items-center gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-gray-300">{gameT[key]}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <Card className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 text-center">
          <h2 className="mb-4 text-xl font-bold text-white">
            {gameT.tagline}
          </h2>
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
