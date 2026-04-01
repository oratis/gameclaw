"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { GAMES } from "@/lib/hoyolab/constants";
import type { GameSlug } from "@/types/games";
import Link from "next/link";
import { Plus, Trash2, RefreshCw } from "lucide-react";

interface LinkedAccount {
  id: string;
  gameId: string;
  uid: string;
  nickname: string | null;
  server: string | null;
  autoCheckin: boolean;
  isActive: boolean;
  lastCheckin: string | null;
}

export default function AccountsPage() {
  const t = useTranslations("accounts");
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    try {
      const res = await fetch("/api/user/accounts");
      const data = await res.json();
      setAccounts(data.accounts || []);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("unlinkConfirm"))) return;
    await fetch(`/api/user/accounts/${id}`, { method: "DELETE" });
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }

  async function toggleAutoCheckin(id: string, current: boolean) {
    await fetch(`/api/user/accounts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autoCheckin: !current }),
    });
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, autoCheckin: !current } : a))
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
          <Link href="/accounts/link">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t("linkNew")}
            </Button>
          </Link>
        </div>

        {accounts.length === 0 ? (
          <Card className="py-16 text-center">
            <p className="mb-4 text-gray-400">No accounts linked yet.</p>
            <Link href="/accounts/link">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t("linkNew")}
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => {
              const game = GAMES[account.gameId as GameSlug];
              return (
                <Card key={account.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold"
                      style={{
                        backgroundColor: (game?.color || "#666") + "20",
                        color: game?.color || "#666",
                      }}
                    >
                      {game?.name?.[0] || "?"}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{game?.name || account.gameId}</h3>
                      <p className="text-sm text-gray-400">
                        UID: {account.uid}
                        {account.nickname && ` - ${account.nickname}`}
                        {account.server && ` (${account.server})`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleAutoCheckin(account.id, account.autoCheckin)}
                      className="flex items-center gap-2"
                    >
                      <span className="text-sm text-gray-400">Auto</span>
                      <Badge variant={account.autoCheckin ? "success" : "default"}>
                        {account.autoCheckin ? "ON" : "OFF"}
                      </Badge>
                    </button>
                    <Badge variant={account.isActive ? "success" : "error"}>
                      {account.isActive ? t("active") : t("inactive")}
                    </Badge>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(account.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
