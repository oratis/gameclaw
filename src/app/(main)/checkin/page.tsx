"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { GAMES } from "@/lib/hoyolab/constants";
import type { GameSlug } from "@/types/games";
import { RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";

interface CheckInLogEntry {
  id: string;
  gameId: string;
  status: string;
  reward: string | null;
  triggeredBy: string;
  createdAt: string;
}

export default function CheckInPage() {
  const t = useTranslations("checkin");
  const [logs, setLogs] = useState<CheckInLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      const res = await fetch("/api/checkin/history");
      const data = await res.json();
      setLogs(data.logs || []);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckinAll() {
    setCheckingIn(true);
    try {
      await fetch("/api/checkin", { method: "POST" });
      await fetchHistory();
    } finally {
      setCheckingIn(false);
    }
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case "already_claimed":
        return <Clock className="h-4 w-4 text-yellow-400" />;
      default:
        return <XCircle className="h-4 w-4 text-red-400" />;
    }
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case "success": return "success" as const;
      case "already_claimed": return "warning" as const;
      default: return "error" as const;
    }
  };

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
          <Button onClick={handleCheckinAll} disabled={checkingIn} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${checkingIn ? "animate-spin" : ""}`} />
            {t("triggerAll")}
          </Button>
        </div>

        <h2 className="mb-4 text-lg font-semibold text-white">{t("history")}</h2>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        ) : logs.length === 0 ? (
          <Card className="py-12 text-center text-gray-400">{t("noHistory")}</Card>
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">{t("date")}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">{t("game")}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">{t("status")}</th>
                  <th className="hidden px-4 py-3 text-left text-sm font-medium text-gray-400 sm:table-cell">{t("triggeredBy")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((log) => {
                  const game = GAMES[log.gameId as GameSlug];
                  return (
                    <tr key={log.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-white">
                        {game?.name || log.gameId}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {statusIcon(log.status)}
                          <Badge variant={statusVariant(log.status)}>
                            {log.status === "success" ? t("success") : log.status === "already_claimed" ? t("alreadyClaimed") : t("failed")}
                          </Badge>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-gray-400 sm:table-cell">
                        {log.triggeredBy}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
