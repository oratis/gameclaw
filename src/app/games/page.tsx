"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { GAMES, GAME_SLUGS } from "@/lib/hoyolab/constants";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export default function GamesPage() {
  const t = useTranslations("games");

  return (
    <div className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">{t("title")}</h1>
          <p className="mt-4 text-lg text-gray-400">{t("subtitle")}</p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {GAME_SLUGS.map((slug) => {
            const game = GAMES[slug];
            const gameT = t.raw(slug) as Record<string, string>;
            return (
              <Link key={slug} href={`/games/${slug}`}>
                <Card className="group h-full cursor-pointer transition-all hover:border-emerald-500/30 hover:bg-white/[0.07]">
                  <div
                    className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl font-bold"
                    style={{ backgroundColor: game.color + "20", color: game.color }}
                  >
                    {game.name[0]}
                  </div>
                  <h2 className="mb-1 text-xl font-semibold text-white group-hover:text-emerald-400 transition-colors">
                    {gameT.title}
                  </h2>
                  <p className="mb-4 text-sm text-gray-400">{gameT.tagline}</p>
                  <ul className="space-y-2">
                    {["feature1", "feature2", "feature3"].map((key) => (
                      <li key={key} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="mt-0.5 text-emerald-400">&#10003;</span>
                        {gameT[key]}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex items-center gap-1 text-sm font-medium text-emerald-400 transition-transform group-hover:translate-x-1">
                    {t("viewDetails")}
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
