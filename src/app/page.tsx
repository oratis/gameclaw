import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { GAMES, GAME_SLUGS } from "@/lib/hoyolab/constants";
import {
  Zap,
  Gamepad2,
  Bot,
  Shield,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default async function Home() {
  const t = await getTranslations("landing");
  const tCommon = await getTranslations("common");

  const features = [
    { icon: Zap, title: t("featureAutoCheckin"), desc: t("featureAutoCheckinDesc") },
    { icon: Gamepad2, title: t("featureMultiGame"), desc: t("featureMultiGameDesc") },
    { icon: Bot, title: t("featureAISkill"), desc: t("featureAISkillDesc") },
    { icon: Shield, title: t("featureSecure"), desc: t("featureSecureDesc") },
  ];

  const steps = [
    { num: "1", title: t("step1"), desc: t("step1Desc") },
    { num: "2", title: t("step2"), desc: t("step2Desc") },
    { num: "3", title: t("step3"), desc: t("step3Desc") },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-20 pt-24 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-emerald-500/10 blur-[120px]" />
        </div>
        <div className="mx-auto max-w-4xl text-center">
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
              href="/docs"
              className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              {tCommon("docs")}
            </Link>
          </div>
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

      {/* Supported Games */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-white">
            {t("supportedGames")}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {GAME_SLUGS.map((slug) => {
              const game = GAMES[slug];
              return (
                <Link key={slug} href={`/games/${slug}`}>
                  <Card className="group cursor-pointer transition-all hover:border-emerald-500/30 hover:bg-white/[0.07]">
                    <div className="flex items-center gap-4">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl font-bold"
                        style={{ backgroundColor: game.color + "20", color: game.color }}
                      >
                        {game.name[0]}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                          {game.name}
                        </h3>
                        <p className="text-sm text-gray-400">{game.description}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-600 transition-transform group-hover:translate-x-1 group-hover:text-emerald-400" />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-white">
            {t("howItWorks")}
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.num} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-xl font-bold text-emerald-400">
                  {step.num}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">{step.title}</h3>
                <p className="text-sm text-gray-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Card className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-400" />
            <h2 className="mb-4 text-2xl font-bold text-white">{t("cta")}</h2>
            <p className="mb-6 text-gray-400">{t("heroDesc")}</p>
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
