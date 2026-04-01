"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Bot, Code, ArrowRight } from "lucide-react";

export default function DocsPage() {
  const t = useTranslations("docs");

  return (
    <div className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">{t("title")}</h1>
          <p className="mt-4 text-lg text-gray-400">{t("subtitle")}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Link href="/docs/skill">
            <Card className="group h-full cursor-pointer transition-all hover:border-emerald-500/30 hover:bg-white/[0.07]">
              <Bot className="mb-4 h-10 w-10 text-emerald-400" />
              <h2 className="mb-2 text-xl font-semibold text-white group-hover:text-emerald-400 transition-colors">
                {t("skillTitle")}
              </h2>
              <p className="mb-4 text-sm text-gray-400">{t("skillDesc")}</p>
              <div className="flex items-center gap-1 text-sm font-medium text-emerald-400">
                {t("gettingStarted")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Card>
          </Link>

          <Link href="/docs/api">
            <Card className="group h-full cursor-pointer transition-all hover:border-emerald-500/30 hover:bg-white/[0.07]">
              <Code className="mb-4 h-10 w-10 text-blue-400" />
              <h2 className="mb-2 text-xl font-semibold text-white group-hover:text-emerald-400 transition-colors">
                {t("apiTitle")}
              </h2>
              <p className="mb-4 text-sm text-gray-400">{t("apiDesc")}</p>
              <div className="flex items-center gap-1 text-sm font-medium text-emerald-400">
                {t("gettingStarted")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
