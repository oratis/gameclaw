import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth_helpers/admin";
import { Card } from "@/components/ui/Card";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Admin · GameClaw",
};

// Server-rendered; reads directly from the DB. (Mirrors /api/admin/metrics
// but cleaner to issue queries directly from the page.)
export default async function AdminPage() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    redirect(gate.reason === "unauthorized" ? "/signin?next=/admin" : "/");
  }

  const DAYS_WINDOW = 7;
  const now = new Date();
  const windowStart = new Date(now.getTime() - DAYS_WINDOW * 24 * 60 * 60 * 1000);

  const [
    userCount,
    activeAccountCount,
    activeSubscriptionCount,
    paidSubscriptionCount,
    taskCount,
    demandCount,
    tasksWindow,
    recentDemand,
    circuitStates,
    workerJobs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.gameAccount.count({ where: { isActive: true } }),
    prisma.subscription.count({ where: { status: "active" } }),
    prisma.subscription.count({
      where: { status: "active", tier: { in: ["pro", "proplus", "enterprise"] } },
    }),
    prisma.task.count(),
    prisma.demandSignal.count(),
    prisma.task.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { gameSlug: true, status: true, capability: true },
    }),
    prisma.demandSignal.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        gameTyped: true,
        gameSlug: true,
        taskDesc: true,
        priceText: true,
        priceType: true,
        createdAt: true,
      },
    }),
    prisma.riskCircuitState.findMany({
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.workerJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        taskId: true,
        pool: true,
        executionState: true,
        createdAt: true,
        errorMessage: true,
      },
    }),
  ]);

  // adapter rollup
  type Rollup = { slug: string; total: number; success: number; alreadyDone: number; failed: number };
  const adapterRollup = new Map<string, Rollup>();
  for (const t of tasksWindow) {
    let r = adapterRollup.get(t.gameSlug);
    if (!r) {
      r = { slug: t.gameSlug, total: 0, success: 0, alreadyDone: 0, failed: 0 };
      adapterRollup.set(t.gameSlug, r);
    }
    r.total++;
    if (t.status === "success") r.success++;
    else if (t.status === "already_done" || t.status === "already_claimed") r.alreadyDone++;
    else if (t.status === "failed") r.failed++;
  }
  const adapters = [...adapterRollup.values()].sort((a, b) => b.total - a.total);

  // capability popularity
  const capCounts = new Map<string, number>();
  for (const t of tasksWindow) {
    capCounts.set(t.capability, (capCounts.get(t.capability) ?? 0) + 1);
  }
  const caps = [...capCounts.entries()]
    .map(([capability, count]) => ({ capability, count }))
    .sort((a, b) => b.count - a.count);

  // top demanded games
  const demandGameCounts = new Map<string, number>();
  for (const d of recentDemand) {
    const key = d.gameSlug ?? d.gameTyped.toLowerCase();
    demandGameCounts.set(key, (demandGameCounts.get(key) ?? 0) + 1);
  }
  const topDemanded = [...demandGameCounts.entries()]
    .map(([game, count]) => ({ game, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Admin</h1>
          <p className="text-sm text-gray-500">
            Last {DAYS_WINDOW} days · signed in as {gate.email}
          </p>
        </div>

        {/* Top-line counts */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Users" value={userCount} />
          <Stat label="Linked accounts" value={activeAccountCount} />
          <Stat label="Active subscriptions" value={activeSubscriptionCount} sub={`${paidSubscriptionCount} paid`} />
          <Stat label="Tasks ever" value={taskCount} sub={`${tasksWindow.length} in window`} />
        </div>

        {/* Per-adapter rollup */}
        <Section title="Adapter activity (last 7 days)">
          {adapters.length === 0 ? (
            <p className="text-sm text-gray-500">No tasks in window.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="pb-2">Slug</th>
                  <th className="pb-2 text-right">Total</th>
                  <th className="pb-2 text-right">Success</th>
                  <th className="pb-2 text-right">Already</th>
                  <th className="pb-2 text-right">Failed</th>
                  <th className="pb-2 text-right">Fail rate</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                {adapters.map((a) => {
                  const rate = a.total > 0 ? a.failed / a.total : 0;
                  return (
                    <tr key={a.slug} className="border-t border-white/5">
                      <td className="py-1.5 font-mono text-xs">{a.slug}</td>
                      <td className="py-1.5 text-right font-mono">{a.total}</td>
                      <td className="py-1.5 text-right font-mono text-emerald-300">{a.success}</td>
                      <td className="py-1.5 text-right font-mono text-blue-300">{a.alreadyDone}</td>
                      <td className="py-1.5 text-right font-mono text-red-300">{a.failed}</td>
                      <td className={`py-1.5 text-right font-mono ${rate > 0.2 ? "text-red-300" : "text-gray-400"}`}>
                        {(rate * 100).toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Section>

        {/* Capability popularity */}
        <Section title="Capability popularity (last 7 days)">
          {caps.length === 0 ? (
            <p className="text-sm text-gray-500">No tasks in window.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {caps.map((c) => (
                <span key={c.capability} className="rounded-md bg-white/5 px-2 py-1 font-mono text-xs text-gray-300">
                  {c.capability} <span className="text-emerald-400">×{c.count}</span>
                </span>
              ))}
            </div>
          )}
        </Section>

        {/* Top demanded games */}
        <Section title={`Top demand signals (${demandCount} total)`}>
          {topDemanded.length === 0 ? (
            <p className="text-sm text-gray-500">No demand signals yet.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {topDemanded.map((d) => (
                <div key={d.game} className="flex justify-between rounded-md bg-white/5 px-3 py-1.5 text-sm">
                  <span className="text-gray-200">{d.game}</span>
                  <span className="font-mono text-emerald-300">{d.count}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Recent demand */}
        {recentDemand.length > 0 && (
          <Section title="Recent demand signals">
            <ul className="divide-y divide-white/5">
              {recentDemand.map((d) => (
                <li key={d.id} className="py-3 text-sm">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium text-white">{d.gameTyped}</span>
                    {d.gameSlug && (
                      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-300">{d.gameSlug}</span>
                    )}
                    {d.priceText && (
                      <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] text-blue-300">
                        {d.priceText}/{d.priceType ?? "?"}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-gray-600">{new Date(d.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-gray-400">{d.taskDesc}</p>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Circuit state */}
        {circuitStates.length > 0 && (
          <Section title="Risk circuit breakers">
            <ul className="space-y-1 text-sm">
              {circuitStates.map((c) => (
                <li key={c.id} className="flex items-center gap-3 rounded bg-white/5 px-3 py-1.5">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] ${c.state === "open" ? "bg-red-500/20 text-red-300" : "bg-emerald-500/20 text-emerald-300"}`}
                  >
                    {c.state}
                  </span>
                  <span className="font-mono text-xs text-gray-300">{c.scope}</span>
                  <span className="ml-auto text-xs text-gray-500">
                    failure rate {(c.failureRate * 100).toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Worker jobs */}
        {workerJobs.length > 0 && (
          <Section title="L3 worker jobs (last 10)">
            <ul className="space-y-1 text-sm">
              {workerJobs.map((j) => (
                <li key={j.id} className="flex items-center gap-3 rounded bg-white/5 px-3 py-1.5">
                  <span className="font-mono text-xs text-gray-300">{j.pool}</span>
                  <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-gray-300">{j.executionState}</span>
                  <span className="ml-auto text-xs text-gray-500">{new Date(j.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value.toLocaleString()}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="mb-3 text-base font-semibold text-white">{title}</h2>
      <Card>{children}</Card>
    </div>
  );
}
