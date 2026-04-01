"use client";

import { use } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { GAMES } from "@/lib/hoyolab/constants";
import type { GameSlug } from "@/types/games";
import { ArrowRight, CheckCircle2, Users, Zap } from "lucide-react";

export default function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const t = useTranslations("games");

  if (!(slug in GAMES)) notFound();

  const game = GAMES[slug as GameSlug];
  const gameT = t.raw(slug) as Record<string, string>;

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
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                {t("linkAccount")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/docs">
              <Button variant="secondary" size="lg">
                {t("viewDetails")}
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <section className="mb-16">
          <h2 className="mb-8 text-2xl font-bold text-white">{t("features")}</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {["feature1", "feature2", "feature3"].map((key, i) => (
              <Card key={key}>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                  {i === 0 ? (
                    <Zap className="h-5 w-5 text-emerald-400" />
                  ) : i === 1 ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <Users className="h-5 w-5 text-emerald-400" />
                  )}
                </div>
                <p className="text-sm text-gray-300">{gameT[key]}</p>
              </Card>
            ))}
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
          <Link href="/signup">
            <Button size="lg" className="gap-2">
              {t("linkAccount")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
