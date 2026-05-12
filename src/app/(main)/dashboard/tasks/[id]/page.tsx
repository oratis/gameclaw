import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { getAdapter } from "@/adapters";
import { ArrowLeft, AlertCircle, CheckCircle2, Clock, Image as ImageIcon } from "lucide-react";

export const metadata = {
  title: "Task detail · GameClaw",
};

const STATUS_BADGE: Record<string, string> = {
  success: "bg-emerald-500/20 text-emerald-300",
  already_done: "bg-blue-500/20 text-blue-300",
  already_claimed: "bg-blue-500/20 text-blue-300",
  failed: "bg-red-500/20 text-red-300",
  skipped: "bg-gray-500/20 text-gray-300",
  running: "bg-yellow-500/20 text-yellow-300",
};

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const { id } = await params;
  const task = await prisma.task.findFirst({
    where: { id, userId: session.user.id },
    include: {
      gameAccount: {
        select: { uid: true, nickname: true, server: true },
      },
    },
  });
  if (!task) notFound();

  // L3-only: pull the worker job + screenshots for context.
  const workerJob =
    task.backendTier === "L3"
      ? await prisma.workerJob.findUnique({
          where: { taskId: task.id },
          select: {
            executionState: true,
            executionName: true,
            pool: true,
            startedAt: true,
            completedAt: true,
            errorMessage: true,
          },
        })
      : null;

  const adapter = getAdapter(task.gameSlug);
  const cost = (task.cost as { ms?: number } | null) ?? null;
  const durationMs = cost?.ms;
  const result = task.result;
  const payload = task.payload;
  const isFail = task.status === "failed";
  const isOk = task.status === "success";

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          {isOk ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          ) : isFail ? (
            <AlertCircle className="h-6 w-6 text-red-400" />
          ) : (
            <Clock className="h-6 w-6 text-yellow-400" />
          )}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">
              {adapter?.displayName ?? task.gameSlug}{" "}
              <span className="font-mono text-sm text-gray-500">/{task.capability}</span>
            </h1>
            <p className="text-xs text-gray-500">{new Date(task.createdAt).toLocaleString()}</p>
          </div>
          <span
            className={`rounded px-2 py-1 text-xs font-medium ${STATUS_BADGE[task.status] ?? "bg-white/10 text-gray-300"}`}
          >
            {task.status}
          </span>
        </div>

        {/* Failure callout if applicable */}
        {isFail && task.errorMessage && (
          <Card className="mb-6 border-red-500/30 bg-red-500/5">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-red-400">
              Error
            </p>
            <p className="whitespace-pre-wrap text-sm text-red-200">{task.errorMessage}</p>
            <p className="mt-2 text-xs text-gray-500">
              {/^Invalid credentials|expired|token expired/i.test(task.errorMessage)
                ? "→ Try re-linking this account at /accounts/link"
                : /quota|exceeded/i.test(task.errorMessage)
                  ? "→ See /settings/billing or /pricing to raise your quota"
                  : /not yet|not implemented|L3/i.test(task.errorMessage)
                    ? "→ This capability needs M3 worker fleet (Pro+, coming soon)"
                    : "→ If this keeps happening, the adapter may need a fix — check the demand form or open an issue."}
            </p>
          </Card>
        )}

        {/* Metadata grid */}
        <Card className="mb-6">
          <dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
            <Row label="Task ID" mono>
              {task.id}
            </Row>
            <Row label="Trigger">
              {task.triggeredBy}
            </Row>
            <Row label="Game">
              {adapter?.displayName ?? task.gameSlug}{" "}
              <span className="font-mono text-xs text-gray-500">({task.gameSlug})</span>
            </Row>
            <Row label="Capability" mono>
              {task.capability}
            </Row>
            <Row label="Backend tier">
              {task.backendTier ?? "L1"}
            </Row>
            <Row label="Status">
              {task.status}
            </Row>
            {task.gameAccount && (
              <>
                <Row label="UID" mono>
                  {task.gameAccount.uid}
                </Row>
                <Row label="Server / nickname">
                  {[task.gameAccount.nickname, task.gameAccount.server]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </Row>
              </>
            )}
            {task.startedAt && (
              <Row label="Started">
                {new Date(task.startedAt).toLocaleString()}
              </Row>
            )}
            {task.finishedAt && (
              <Row label="Finished">
                {new Date(task.finishedAt).toLocaleString()}
              </Row>
            )}
            {typeof durationMs === "number" && (
              <Row label="Duration">
                {(durationMs / 1000).toFixed(2)}s
              </Row>
            )}
            {task.templateRunId && (
              <Row label="Template run">
                <span className="font-mono text-xs">{task.templateRunId}</span>
                {typeof task.templateStepIdx === "number" && (
                  <span className="ml-2 text-xs text-gray-500">step {task.templateStepIdx + 1}</span>
                )}
              </Row>
            )}
          </dl>
        </Card>

        {/* Payload / Result blobs */}
        {payload && Object.keys(payload as object).length > 0 && (
          <Card className="mb-6">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
              Payload
            </p>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-black/30 p-3 font-mono text-xs text-gray-300">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </Card>
        )}
        {result !== null && result !== undefined && (
          <Card className="mb-6">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
              Result data
            </p>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-black/30 p-3 font-mono text-xs text-gray-300">
              {JSON.stringify(result, null, 2)}
            </pre>
          </Card>
        )}

        {/* Worker / L3 detail */}
        {workerJob && (
          <Card className="mb-6">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
              L3 worker job
            </p>
            <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
              <Row label="Pool" mono>{workerJob.pool}</Row>
              <Row label="State" mono>{workerJob.executionState}</Row>
              {workerJob.executionName && (
                <div className="col-span-2">
                  <Row label="Execution" mono>
                    <span className="break-all">{workerJob.executionName}</span>
                  </Row>
                </div>
              )}
              {workerJob.startedAt && (
                <Row label="Worker started">
                  {new Date(workerJob.startedAt).toLocaleString()}
                </Row>
              )}
              {workerJob.completedAt && (
                <Row label="Worker completed">
                  {new Date(workerJob.completedAt).toLocaleString()}
                </Row>
              )}
            </dl>
            {workerJob.errorMessage && (
              <p className="mt-3 text-xs text-red-300">{workerJob.errorMessage}</p>
            )}
          </Card>
        )}

        {/* Screenshots (L3) */}
        {task.screenshotUrls && task.screenshotUrls.length > 0 && (
          <Card className="mb-6">
            <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-500">
              <ImageIcon className="h-3.5 w-3.5" /> Screenshots
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {task.screenshotUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden rounded border border-white/10 transition-colors hover:border-emerald-500/40"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`screenshot ${i + 1}`}
                    className="w-full bg-black/30"
                  />
                </a>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  mono,
  children,
}: {
  label: string;
  mono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className={`mt-0.5 ${mono ? "font-mono text-xs" : ""} text-gray-200`}>
        {children}
      </dd>
    </div>
  );
}
