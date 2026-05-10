/**
 * Cloud Run Jobs dispatch.
 *
 * Calls Cloud Run Admin API v2 to start an execution of a pre-deployed
 * worker job, passing per-execution env-var overrides so each worker
 * instance knows which task it's processing.
 *
 * Required env:
 *   GCP_PROJECT_ID            — e.g. "gameclaw-492005"
 *   GCP_REGION                — e.g. "us-central1"
 *   WORKER_CALLBACK_BASE_URL  — public origin, e.g. "https://gogameclaw.com"
 *
 * Cloud Run Job naming convention:
 *   gameclaw-runner-<gameSlug>   (e.g. "gameclaw-runner-arknights")
 *
 * Workers must:
 *   1. Read env: TASK_ID, CALLBACK_TOKEN, CALLBACK_URL
 *   2. POST to {CALLBACK_URL}/api/internal/worker-creds → get creds + payload
 *   3. Run the game → MAA / per-game OSS automation
 *   4. POST to {CALLBACK_URL}/api/internal/worker-callback with results
 */

import { GoogleAuth } from "google-auth-library";

const RUN_API_BASE = "https://run.googleapis.com";

export interface CloudRunJobsDispatchInput {
  /** Worker pool key, e.g. "l3-arknights" — maps to job name suffix */
  pool: string;
  /** The Task row's ID — passed to worker as env var TASK_ID */
  taskId: string;
  /** One-time callback token */
  callbackToken: string;
}

export interface CloudRunJobsDispatchOutput {
  executionName: string;
  rawResponse: unknown;
}

let _authClient: GoogleAuth | null = null;
function getAuth(): GoogleAuth {
  if (!_authClient) {
    _authClient = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
  }
  return _authClient;
}

function jobNameForPool(pool: string): string {
  // pool="l3-arknights" → job name="gameclaw-runner-arknights"
  if (pool.startsWith("l3-")) {
    return `gameclaw-runner-${pool.slice(3)}`;
  }
  return `gameclaw-runner-${pool}`;
}

export async function dispatchCloudRunJob(
  input: CloudRunJobsDispatchInput
): Promise<CloudRunJobsDispatchOutput> {
  const projectId = process.env.GCP_PROJECT_ID;
  const region = process.env.GCP_REGION ?? "us-central1";
  const callbackBase =
    process.env.WORKER_CALLBACK_BASE_URL ?? "https://gogameclaw.com";

  if (!projectId) {
    throw new Error("GCP_PROJECT_ID env not set");
  }

  const jobName = jobNameForPool(input.pool);
  const url = `${RUN_API_BASE}/v2/projects/${projectId}/locations/${region}/jobs/${jobName}:run`;

  const body = {
    overrides: {
      containerOverrides: [
        {
          env: [
            { name: "TASK_ID", value: input.taskId },
            { name: "CALLBACK_TOKEN", value: input.callbackToken },
            { name: "CALLBACK_URL", value: callbackBase },
          ],
        },
      ],
      // Hard ceiling on execution wall time.
      timeout: "1800s",
    },
  };

  const auth = getAuth();
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const accessToken =
    typeof tokenResponse === "string"
      ? tokenResponse
      : tokenResponse?.token ?? null;
  if (!accessToken) {
    throw new Error("Failed to obtain GCP access token");
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Cloud Run Jobs run failed: ${res.status} ${res.statusText} — ${text}`
    );
  }

  const data = (await res.json()) as { name?: string };
  if (!data.name) {
    throw new Error(
      `Cloud Run Jobs run returned unexpected response shape: ${JSON.stringify(data)}`
    );
  }

  return { executionName: data.name, rawResponse: data };
}
