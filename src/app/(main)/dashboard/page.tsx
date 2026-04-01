"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { GAMES } from "@/lib/hoyolab/constants";
import type { GameSlug } from "@/types/games";
import Link from "next/link";
import { Plus, RefreshCw, CheckCircle2, Clock, XCircle } from "lucide-react";

interface LinkedAccount {
  id: string;
  gameId: string;
  uid: string;
  nickname: string | null;
  autoCheckin: boolean;
  isActive: boolean;
  lastCheckin: string | null;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const t = useTranslations("dashboard");
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    fetch("/api/user/accounts")
      .then((res) => res.json())
      .then((data) => {
        setAccounts(data.accounts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleCheckinAll() {
    setCheckingIn(true);
    try {
      await fetch("/api/checkin", { method: "POST" });
      const res = await fetch("/api/user/accounts");
      const data = await res.json();
      setAccounts(data.accounts || []);
    } finally {
      setCheckingIn(false);
    }
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
            {session?.user?.name && (
              <p className="mt-1 text-gray-400">
                {t("welcomeBack")}, {session.user.name}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={handleCheckinAll}
              disabled={checkingIn || accounts.length === 0}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${checkingIn ? "animate-spin" : ""}`} />
              {t("checkinAll")}
            </Button>
            <Link href="/accounts/link">
              <Button variant="secondary" className="gap-2">
                <Plus className="h-4 w-4" />
                {t("linkAccount")}
              </Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : accounts.length === 0 ? (
          <Card className="flex flex-col items-center py-16 text-center">
            <p className="mb-4 text-gray-400">{t("noAccounts")}</p>
            <Link href="/accounts/link">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t("linkAccount")}
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => {
              const game = GAMES[account.gameId as GameSlug];
              const isCheckedToday =
                account.lastCheckin &&
                new Date(account.lastCheckin).toDateString() ===
                  new Date().toDateString();

              return (
                <Card key={account.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold"
                        style={{
                          backgroundColor: (game?.color || "#666") + "20",
                          color: game?.color || "#666",
                        }}
                      >
                        {game?.name?.[0] || "?"}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">
                          {game?.name || account.gameId}
                        </h3>
                        <p className="text-sm text-gray-400">
                          UID: {account.uid}
                          {account.nickname && ` (${account.nickname})`}
                        </p>
                      </div>
                    </div>
                    <Badge variant={account.isActive ? "success" : "default"}>
                      {account.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-4">
                    <div className="flex items-center gap-2 text-sm">
                      {isCheckedToday ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <span className="text-emerald-400">{t("checked")}</span>
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4 text-yellow-400" />
                          <span className="text-yellow-400">{t("pending")}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      {t("autoCheckin")}:
                      <Badge variant={account.autoCheckin ? "success" : "default"}>
                        {account.autoCheckin ? "ON" : "OFF"}
                      </Badge>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
