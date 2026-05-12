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
  const [streamText, setStreamText] = useState("");
  const [streamThinking, setStreamThinking] = useState("");

  function displayName(slug: string): string {
    return planResp?.accounts.find((a) => a.slug === slug)?.displayName ?? slug;
  }

  async function handlePlan(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPlanResp(null);
    setResults(null);
    setStreamText("");
    setStreamThinking("");
    setPlanning(true);
    try {
      const res = await fetch("/api/plan/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          locale: typeof navigator !== "undefined" ? navigator.language : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error || "Planner failed");
        setPlanning(false);
        return;
      }
      if (!res.body) {
        setError("Streaming not supported by this browser");
        setPlanning(false);
        return;
      }

      // SSE parse: chunks contain `event: <name>\ndata: <json>\n\n` frames.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let plan: Plan | null = null;
      let usage: PlanResponse["usage"] | null = null;
      let accounts: PlanResponse["accounts"] | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        // Split on the SSE frame boundary
        let idx;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const frame = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const lines = frame.split("\n");
          let event = "message";
          let data = "";
          for (const ln of lines) {
            if (ln.startsWith("event: ")) event = ln.slice(7).trim();
            else if (ln.startsWith("data: ")) data += ln.slice(6);
          }
          if (!data) continue;
          try {
            const parsed = JSON.parse(data);
            switch (event) {
              case "thinking":
                setStreamThinking((prev) => prev + parsed);
                break;
              case "text":
                setStreamText((prev) => prev + parsed);
                break;
              case "plan":
                plan = parsed as Plan;
                break;
              case "usage":
                usage = parsed as PlanResponse["usage"];
                break;
              case "accounts":
                accounts = parsed as PlanResponse["accounts"];
                break;
              case "error":
                setError(
                  parsed.error || "Planner stream error"
                );
                break;
            }
          } catch {
            // ignore malformed frame
          }
        }
      }

      if (plan && usage && accounts) {
        setPlanResp({ plan, usage, accounts });
      } else if (!plan) {
        setError("Planner stream ended without a plan");
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

        {/* Streaming preview — visible while planning, then replaced by the parsed plan card */}
        {planning && (streamThinking || streamText) && (
          <Card className="mb-6 border-emerald-500/20 bg-emerald-500/5">
            {streamThinking && (
              <details className="mb-3 text-xs text-gray-400" open>
                <summary className="cursor-pointer text-gray-300">
                  Thinking ({streamThinking.length} chars)
                </summary>
                <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap font-mono text-[11px]">
                  {streamThinking}
                </pre>
              </details>
            )}
            {streamText && (
              <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] text-gray-300">
                {streamText}
              </pre>
            )}
          </Card>
        )}

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
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  onClick={handleExecute}
                  className="flex-1"
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
                <Button
                  onClick={async () => {
                    const name = window.prompt(
                      "Save as routine — name this template:",
                      "My daily routine"
                    );
                    if (!name) return;
                    const res = await fetch("/api/templates", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name,
                        steps: planResp.plan.tasks,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      setError(data.error || "Failed to save template");
                    } else {
                      window.alert(`Saved as "${data.template.name}"`);
                    }
                  }}
                  className="bg-white/5 hover:bg-white/10"
                  disabled={executing}
                >
                  Save as routine
                </Button>
              </div>
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
