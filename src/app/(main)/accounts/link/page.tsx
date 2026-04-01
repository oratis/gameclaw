"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { GAMES, GAME_SLUGS } from "@/lib/hoyolab/constants";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function LinkAccountPage() {
  const t = useTranslations("accounts");
  const router = useRouter();
  const [gameId, setGameId] = useState("");
  const [ltokenV2, setLtokenV2] = useState("");
  const [ltuidV2, setLtuidV2] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/user/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, ltokenV2, ltuidV2 }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("linkError"));
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/accounts"), 1500);
      }
    } catch {
      setError(t("linkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-2xl font-bold text-white">{t("linkTitle")}</h1>
        <p className="mb-8 text-gray-400">{t("linkDesc")}</p>

        {success ? (
          <Card className="flex flex-col items-center py-12 text-center">
            <CheckCircle2 className="mb-4 h-12 w-12 text-emerald-400" />
            <p className="text-lg font-semibold text-white">{t("linkSuccess")}</p>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-300">
                {t("selectGame")}
              </label>
              <select
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                required
                className="flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="" className="bg-gray-900">
                  --
                </option>
                {GAME_SLUGS.map((slug) => (
                  <option key={slug} value={slug} className="bg-gray-900">
                    {GAMES[slug].name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              id="ltokenV2"
              label={t("ltokenV2")}
              placeholder="v2_CAISDG..."
              value={ltokenV2}
              onChange={(e) => setLtokenV2(e.target.value)}
              required
            />

            <Input
              id="ltuidV2"
              label={t("ltuidV2")}
              placeholder="123456789"
              value={ltuidV2}
              onChange={(e) => setLtuidV2(e.target.value)}
              required
            />

            <Card className="bg-blue-500/5 border-blue-500/20">
              <h3 className="mb-2 text-sm font-semibold text-blue-400">
                {t("cookieGuide")}
              </h3>
              <p className="whitespace-pre-line text-sm text-gray-400">
                {t("cookieGuideSteps")}
              </p>
            </Card>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "..." : t("linkNew")}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
