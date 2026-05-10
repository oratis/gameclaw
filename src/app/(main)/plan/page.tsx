"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Loader2,
  ArrowRight,
  XCircle,
} from "lucide-react";

interface PlannedTask {
  gameSlug: string;
  capability: string;
  rationale: string;
}

interface Plan {
  reasoning: string;
  tasks: PlannedTask[];
  unsupportedRequests: string[];
}

interface PlanResponse {
  plan: Plan;
  usage: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens: number;
    cacheCreationInputTokens: number;
    costUsd: number;
  };
  accounts: Array<{ slug: string; displayName: string; vendor: string }>;
}

interface ExecutionResult {
  gameSlug: string;
  capability: string;
  taskId?: string;
  status: string;
  message: string;
  reward?: string;
}

const STATUS_PILL: Record<string, string> = {
  success: "bg-emerald-500/20 text-emerald-300",
  already_done: "bg-blue-500/20 text-blue-300",
  failed: "bg-red-500/20 text-red-300",
  skipped: "bg-gray-500/20 text-gray-300",
};

export default function PlanPage() {
  const [prompt, setPrompt] = useState("");
  const [planning, setPlanning] = useState(false);
  const [planResp, setPlanResp] = useState<PlanResponse | null>(null);
  const [executing, setExecuting] = useState(false);
  const [results, setResults] = useState<ExecutionResult[] | null>(null);
  const [error, setError] = useState("");

  function displayName(slug: string): string {
    return planResp?.accounts.find((a) => a.slug === slug)?.displayName ?? slug;
  }

  async function handlePlan(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPlanResp(null);
    setResults(null);
    setPlanning(true);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          locale: typeof navigator !== "undefined" ? navigator.language : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Planner failed");
      } else {
        setPlanResp(data);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setPlanning(false);
    }
  }

  async function handleExecute() {
    if (!planResp) return;
    setError("");
    setResults(null);
    setExecuting(true);
    try {
      const res = await fetch("/api/plan/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: planResp.plan.tasks }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Execution failed");
      } else {
        setResults(data.results);
      }
    } catch {
      setError("Network error during execution");
    } finally {
      setExecuting(false);
    }
  }

  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-3">
          <Sparkles className="h-7 w-7 text-emerald-400" />
          <h1 className="text-2xl font-bold text-white">AI Planner</h1>
        </div>

        <p className="mb-8 text-gray-400">
          Tell the planner what you want done in plain language. It proposes
          tasks across your linked accounts; you preview the plan before it runs.
        </p>

        <form onSubmit={handlePlan} className="mb-8 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="prompt"
              className="block text-sm font-medium text-gray-300"
            >
              What should the AI do?
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
              rows={3}
              placeholder="e.g. 把今天能做的全部做了 / sign me in everywhere / only do daily check-ins for HoYo games"
              className="flex w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={planning || !prompt.trim()}
          >
            {planning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Planning...
              </>
            ) : (
              <>
                Propose plan <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        {planResp && (
          <div className="space-y-6">
            <Card>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                Reasoning
              </p>
              <p className="text-sm text-gray-200">{planResp.plan.reasoning}</p>
            </Card>

            <Card>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Plan ({planResp.plan.tasks.length} task
                  {planResp.plan.tasks.length === 1 ? "" : "s"})
                </p>
                <p className="text-xs text-gray-600">
                  cost ${planResp.usage.costUsd.toFixed(4)} · in{" "}
                  {planResp.usage.inputTokens}t / out {planResp.usage.outputTokens}t
                  {planResp.usage.cacheReadInputTokens > 0
                    ? ` · cached ${planResp.usage.cacheReadInputTokens}t`
                    : ""}
                </p>
              </div>

              {planResp.plan.tasks.length === 0 ? (
                <p className="py-3 text-sm text-gray-400">
                  No tasks to run.
                </p>
              ) : (
                <ul className="space-y-2">
                  {planResp.plan.tasks.map((task, i) => (
                    <li
                      key={`${task.gameSlug}-${task.capability}-${i}`}
                      className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] text-gray-500">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="font-medium text-white">
                          {displayName(task.gameSlug)}
                        </span>
                        <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[11px] text-emerald-300">
                          {task.capability}
                        </span>
                      </div>
                      {task.rationale && (
                        <p className="mt-1.5 ml-7 text-xs text-gray-400">
                          {task.rationale}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {planResp.plan.unsupportedRequests.length > 0 && (
              <Card className="border-yellow-500/20 bg-yellow-500/5">
                <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-yellow-400">
                  <XCircle className="h-3.5 w-3.5" /> Couldn&apos;t fulfill
                </p>
                <ul className="space-y-1 text-sm text-gray-300">
                  {planResp.plan.unsupportedRequests.map((u, i) => (
                    <li key={i}>· {u}</li>
                  ))}
                </ul>
              </Card>
            )}

            {planResp.plan.tasks.length > 0 && (
              <Button
                onClick={handleExecute}
                className="w-full"
                disabled={executing}
              >
                {executing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running...
                  </>
                ) : (
                  <>
                    Run plan <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {results && (
          <Card className="mt-6">
            <p className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-500">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Results
            </p>
            <ul className="space-y-2">
              {results.map((r, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">
                      {displayName(r.gameSlug)}
                    </span>
                    <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-gray-400">
                      {r.capability}
                    </span>
                    <span
                      className={`ml-auto rounded px-1.5 py-0.5 text-[11px] font-medium ${STATUS_PILL[r.status] ?? "bg-white/10 text-gray-300"}`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400">{r.message}</p>
                  {r.reward && (
                    <p className="mt-1 text-xs text-emerald-400">
                      reward: {r.reward}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
