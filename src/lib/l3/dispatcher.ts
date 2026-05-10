/**
 * L3 worker dispatcher (M3 — architectural stub).
 *
 * What this becomes (per plan-tasks.md M3):
 *   - Each L3 task type maps to a worker pool (gameclaw-runner-arknights, ...)
 *   - Pool is a Cloud Run Job spec containing waydroid + Android + game APK +
 *     a wrapped OSS automation tool (MAA / March7thAssistant / ok-wuwa)
 *   - dispatchL3Task() enqueues the task → Cloud Run Jobs API spawns a worker
 *     instance → worker pulls credentials from Secret Manager via task.id
 *   - Worker writes screenshots to GCS, posts result to /api/internal/worker-callback
 *
 * What it is today: a stub that returns failed TaskResult until M3 ships.
 *
 * Why ship the stub now:
 *   1. Capability enum + adapter declarations + UI surface must align with the
 *      eventual L3 surface. The stub locks the contract.
 *   2. enforceL3Entitlement() in runTask exercises the Pro+ gate now, so the
 *      billing path is correct on day 1 of M3 launch.
 *   3. Lets us write end-to-end tests that exercise quota → entitlement →
 *      dispatch → result flow without a real emulator running.
 */

import type { Capability, Credentials, Task, TaskResult } from "@/adapters/types";

export interface L3DispatchInput {
  /** The Task row's ID — workers reference it for status callbacks. */
  taskId: string;
  /** User's adapter credentials (already decrypted). */
  creds: Credentials;
  /** The capability to execute (e.g. weekly_dungeon). */
  task: Task;
  /** Game slug — picks the right worker pool. */
  gameSlug: string;
  /** Optional UID for accounts with multiple roles. */
  uid?: string;
}

const M3_NOT_LIVE_MESSAGE =
  "L3 capability requested. The vision-worker fleet is on the M3 roadmap and not yet deployed. Track progress in plan-tasks.md.";

export async function dispatchL3Task(
  _input: L3DispatchInput
): Promise<TaskResult> {
  // M3 will replace this with a Cloud Run Jobs invocation. Until then, every
  // L3 task fails fast with a clear message — no half-implemented behavior.
  return {
    status: "failed",
    message: M3_NOT_LIVE_MESSAGE,
  };
}

export type { Capability };
