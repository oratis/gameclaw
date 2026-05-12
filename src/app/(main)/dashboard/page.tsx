"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import {
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  Sparkles,
  ListChecks,
  Trash2,
  PlayCircle,
} from "lucide-react";

interface LinkedAccount {
  id: string;
  gameId: string;
  uid: string;
  nickname: string | null;
  autoCheckin: boolean;
  isActive: boolean;
  needsRelink: boolean;
  lastCheckin: string | null;
}

interface AdapterMeta {
  slug: string;
  vendor: string;
  displayName: string;
  capabilities: string[];
}

interface TaskRow {
  id: string;
  gameSlug: string;
  capability: string;
  status: string;
  triggeredBy: string;
  createdAt: string;
}

interface TaskTemplate {
  id: string;
  name: string;
  schedule: string | null;
  steps: Array<{ gameSlug: string; capability: string }>;
}

interface Subscription {
  tier: string;
  monthlyTaskQuota: number;
  monthlyPlanCallQuota: number;
}

interface UsageMeter {
  taskCount: number;
  planCallCount: number;
}

const VENDOR_ACCENT: Record<string, string> = {
  hoyoverse: "#4ECDC4",
  kuro: "#A78BFA",
  hypergryph: "#FBBF24",
};

const STATUS_PILL: Record<string, string> = {
  success: "bg-emerald-500/20 text-emerald-300",
  already_done: "bg-blue-500/20 text-blue-300",
  already_claimed: "bg-blue-500/20 text-blue-300",
  failed: "bg-red-500/20 text-red-300",
  skipped: "bg-gray-500/20 text-gray-300",
  running: "bg-yellow-500/20 text-yellow-300",
};

function isCheckedInToday(lastCheckin: string | null): boolean {
  if (!lastCheckin) return false;
  const checkinDate = new Date(lastCheckin).toISOString().slice(0, 10);
  const todayDate = new Date().toISOString().slice(0, 10);
  return checkinDate === todayDate;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const t = useTranslations("dashboard");
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [adapters, setAdapters] = useState<AdapterMeta[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [billing, setBilling] = useState<{
    sub: Subscription | null;
    meter: UsageMeter | null;
  }>({ sub: null, meter: null });
  const [reportMd, setReportMd] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const adapterFor = useCallback(
    (slug: string) => adapters.find((a) => a.slug === slug),
    [adapters]
  );

  const refresh = useCallback(async () => {
    try {
      const [accs, adps, ts, tpls] = await Promise.all([
        fetch("/api/user/accounts").then((r) => r.json()),
        fetch("/api/adapters").then((r) => r.json()),
        fetch("/api/tasks?limit=10").then((r) => r.json()),
        fetch("/api/templates").then((r) => r.json()),
      ]);
      setAccounts(accs.accounts || []);
      setAdapters(adps.adapters || []);
      setTasks(ts.tasks || []);
      setTemplates(tpls.templates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleCheckinAll() {
    setCheckingIn(true);
    setError(null);
    try {
      const res = await fetch("/api/checkin", { method: "POST" });
      if (!res.ok) throw new Error("Check-in request failed");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setCheckingIn(false);
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  async function runTemplate(id: string) {
    const res = await fetch(`/api/templates/${id}/run`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Template run failed");
      return;
    }
    await refresh();
  }

  async function fetchReport() {
    setReportLoading(true);
    setReportMd(null);
    try {
      const res = await fetch(
        `/api/report/weekly?days=7&locale=${typeof navigator !== "undefined" ? navigator.language : "en"}`
      );
      const data = await res.json();
      setReportMd(data.markdown ?? data.error ?? "No report");
    } catch (e) {
      setReportMd(e instanceof Error ? e.message : "Failed to load report");
    } finally {
      setReportLoading(false);
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
            <Link href="/plan">
              <Button variant="secondary" className="gap-2">
                <Sparkles className="h-4 w-4" />
                AI Planner
              </Button>
            </Link>
            <Link href="/accounts/link">
              <Button variant="secondary" className="gap-2">
                <Plus className="h-4 w-4" />
                {t("linkAccount")}
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Linked accounts */}
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
          <div className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => {
              const a = adapterFor(account.gameId);
              const accent = VENDOR_ACCENT[a?.vendor ?? ""] ?? "#9CA3AF";
              const checkedToday = isCheckedInToday(account.lastCheckin);
              return (
                <Card key={account.id} className={`space-y-4 ${account.needsRelink ? "border-yellow-500/40 bg-yellow-500/[0.04]" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold"
                        style={{
                          backgroundColor: accent + "20",
                          color: accent,
                        }}
                      >
                        {(a?.displayName ?? account.gameId)[0]}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">
                          {a?.displayName ?? account.gameId}
                        </h3>
                        <p className="text-sm text-gray-400">
                          UID: {account.uid}
                          {account.nickname && ` (${account.nickname})`}
                        </p>
                      </div>
                    </div>
                    <Badge variant={account.isActive ? "success" : "default"}>
                      {account.isActive ? t("active") : t("inactive")}
                    </Badge>
                  </div>
                  {account.needsRelink && (
                    <Link
                      href="/accounts/link"
                      className="-mx-4 -my-2 block rounded-lg bg-yellow-500/10 px-4 py-2 text-xs text-yellow-300 hover:bg-yellow-500/20"
                    >
                      ⚠️ Credentials appear expired — click to re-link
                    </Link>
                  )}
                  <div className="flex items-center justify-between border-t border-white/5 pt-4">
                    <div className="flex items-center gap-2 text-sm">
                      {checkedToday ? (
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
                        {account.autoCheckin ? t("on") : t("off")}
                      </Badge>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Templates */}
        {templates.length > 0 && (
          <div className="mb-10">
            <div className="mb-4 flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">My routines</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {templates.map((tpl) => (
                <Card key={tpl.id} className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">{tpl.name}</p>
                    <p className="font-mono text-xs text-gray-500">
                      {tpl.steps.length} step{tpl.steps.length === 1 ? "" : "s"}
                      {tpl.schedule ? ` · cron ${tpl.schedule}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => runTemplate(tpl.id)}
                      className="rounded p-1.5 text-emerald-400 hover:bg-white/5"
                      title="Run now"
                    >
                      <PlayCircle className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteTemplate(tpl.id)}
                      className="rounded p-1.5 text-red-400 hover:bg-white/5"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Recent tasks */}
        {tasks.length > 0 && (
          <div className="mb-10">
            <h2 className="mb-4 text-lg font-semibold text-white">Recent activity</h2>
            <Card>
              <ul className="divide-y divide-white/5">
                {tasks.map((task) => (
                  <li key={task.id}>
                    <Link
                      href={`/dashboard/tasks/${task.id}`}
                      className="flex items-center gap-3 py-2 text-sm transition-colors hover:bg-white/[0.02]"
                    >
                      <span className="font-mono text-xs text-gray-500 w-32 shrink-0">
                        {new Date(task.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="flex-1 truncate text-gray-200">
                        {adapterFor(task.gameSlug)?.displayName ?? task.gameSlug}
                      </span>
                      <span className="font-mono text-[11px] text-gray-400">
                        {task.capability}
                      </span>
                      <span className="font-mono text-[10px] text-gray-600">
                        {task.triggeredBy}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[11px] ${STATUS_PILL[task.status] ?? "bg-white/10 text-gray-300"}`}
                      >
                        {task.status}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}

        {/* Weekly report */}
        <div className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Weekly digest</h2>
            <Button
              variant="secondary"
              onClick={fetchReport}
              disabled={reportLoading}
              className="gap-2"
            >
              {reportLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate
            </Button>
          </div>
          {reportMd && (
            <Card>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-200">
                {reportMd}
              </pre>
            </Card>
          )}
        </div>

        {/* Billing footer */}
        <div className="text-center text-xs text-gray-500">
          <Link href="/settings/billing" className="hover:text-gray-300">
            View tier and usage →
          </Link>
        </div>
      </div>
    </div>
  );
}
