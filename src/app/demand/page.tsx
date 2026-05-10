"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, AlertCircle } from "lucide-react";

export default function DemandPage() {
  const [game, setGame] = useState("");
  const [task, setTask] = useState("");
  const [price, setPrice] = useState("");
  const [priceType, setPriceType] = useState<"task" | "monthly">("monthly");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/demand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game,
          task,
          price,
          priceType,
          email,
          source: "web/demand",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-3xl font-bold">Tell us what you want hands-off</h1>
        <p className="mb-8 text-gray-400">
          GameClaw is building AI 代练 for everything. Tell us which game, which
          task you hate doing, and what you&apos;d pay. We&apos;ll build it for you sooner if
          enough people ask.
        </p>

        {submitted ? (
          <Card className="flex flex-col items-center py-12 text-center">
            <CheckCircle2 className="mb-4 h-12 w-12 text-emerald-400" />
            <p className="mb-2 text-lg font-semibold">Got it. Thanks.</p>
            <p className="text-sm text-gray-400">
              Submit another? Refresh the page.
            </p>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Input
              id="game"
              label="Game"
              placeholder="e.g. 原神 / Wuthering Waves / Arknights / WoW"
              value={game}
              onChange={(e) => setGame(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label
                htmlFor="task"
                className="block text-sm font-medium text-gray-300"
              >
                What task should AI do for you? *
              </label>
              <textarea
                id="task"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                required
                rows={4}
                placeholder="e.g. 把每天的派遣全部接掉，不浪费体力 / auto-clear weekly Memory of Chaos / spend all 240 sanity in Annihilation"
                className="flex w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                id="price"
                label="What would you pay?"
                placeholder="e.g. ¥10 / $5 / free"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <div className="space-y-1.5">
                <label
                  htmlFor="priceType"
                  className="block text-sm font-medium text-gray-300"
                >
                  Per...
                </label>
                <select
                  id="priceType"
                  value={priceType}
                  onChange={(e) =>
                    setPriceType(e.target.value as "task" | "monthly")
                  }
                  className="flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="monthly" className="bg-gray-900">
                    month
                  </option>
                  <option value="task" className="bg-gray-900">
                    task
                  </option>
                </select>
              </div>
            </div>

            <Input
              id="email"
              type="email"
              label="Email (optional)"
              placeholder="we&apos;ll ping you when it&apos;s ready"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Sending..." : "Submit"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
