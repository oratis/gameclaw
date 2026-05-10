# L3 Worker Setup

GameClaw L3 (T3 capabilities —副本 / dailies / 上分) requires a worker
fleet that runs **Android emulators** and drives in-game UI via OSS
automation tools (MAA / March7thAssistant / ok-wuthering-waves).

The platform code (everything in `src/lib/l3/*`, `src/app/api/internal/*`) is
**fully wired** for this — schema, dispatch, callback, credential delivery,
AI Verifier, risk circuit breaker. What's left is **standing up the actual
worker fleet**, which is operations work.

## Why this is non-trivial

Running Android-in-a-container needs **KVM passthrough** + privileged
kernel features (`/dev/binder`, `/dev/ashmem`). This rules out:

- ✗ **Cloud Run Jobs** — doesn't expose `/dev/kvm`
- ✗ **standard GKE Autopilot** — same restriction
- ✗ **AWS Fargate** — same

Working deployment targets:

- ✓ **GCE Compute VMs** with nested virtualization enabled (`n2-standard-2`+)
- ✓ **GKE Standard mode** with `kvm-device-plugin` + privileged pods
- ✓ Bare metal with KVM
- ✓ **Genymotion Cloud** (paid per-seat)

## Recommended path: GCE managed instance group + custom image

### 1. Build the worker image locally

```bash
cd worker/runner-arknights
docker buildx build \
  --platform linux/amd64 \
  -t us-central1-docker.pkg.dev/gameclaw-492005/gameclaw-repo/runner-arknights:latest \
  --push .
```

Note: the Dockerfile uses `redroid/redroid:13.0.0_64only-latest` as the Android
base. Other games will use the same Android base + their own per-game runner
layer (March7thAssistant for Star Rail, ok-wuwa for Wuthering Waves).

### 2. Create a custom GCE image with KVM enabled

```bash
gcloud compute images create gameclaw-l3-runner-base \
  --source-image-family=debian-12 \
  --source-image-project=debian-cloud \
  --licenses="https://compute.googleapis.com/compute/v1/projects/vm-options/global/licenses/enable-vmx"
```

(The `enable-vmx` license is what unlocks nested virtualization on the VM.)

### 3. Bake Android + Arknights APK into the image

This is the part that **requires manual operator effort** and isn't
automatable due to Hypergryph TOS:

1. Spin up a temporary VM from the base image
2. Install redroid: `docker pull redroid/redroid:13.0.0_64only-latest`
3. Install the Arknights APK via ADB into the redroid container
4. Pre-cache game assets (download all updates while logged in to a test account)
5. Snapshot the VM disk → save as `gameclaw-l3-runner-arknights-v1`

### 4. Deploy as a managed instance group (worker pool)

```bash
gcloud compute instance-templates create gameclaw-runner-arknights \
  --image=gameclaw-l3-runner-arknights-v1 \
  --machine-type=n2-standard-2 \
  --service-account=gameclaw-l3-runner@gameclaw-492005.iam.gserviceaccount.com \
  --scopes=cloud-platform \
  --metadata=startup-script='docker run --rm \
    --device /dev/kvm \
    --device /dev/binder \
    --device /dev/ashmem \
    -e TASK_ID=$TASK_ID \
    -e CALLBACK_TOKEN=$CALLBACK_TOKEN \
    -e CALLBACK_URL=https://gogameclaw.com \
    us-central1-docker.pkg.dev/gameclaw-492005/gameclaw-repo/runner-arknights:latest'

# Pool size 0 — instances are spun up per dispatch
gcloud compute instance-groups managed create gameclaw-runner-arknights-pool \
  --base-instance-name=gameclaw-runner-arknights \
  --template=gameclaw-runner-arknights \
  --size=0 \
  --zone=us-central1-a
```

### 5. Update dispatcher to use GCE Instance Groups

The current `src/lib/l3/cloudrun.ts` calls Cloud Run Jobs API. To use GCE
managed instance groups instead:

```ts
// src/lib/l3/gce.ts (replace cloudrun.ts entry point)
import { InstanceGroupManagersClient } from "@google-cloud/compute";

const client = new InstanceGroupManagersClient();
await client.resize({
  project,
  zone,
  instanceGroupManager: `gameclaw-runner-${gameSlug}-pool`,
  size: currentSize + 1,
});
```

The pool's startup script picks up the env vars passed in via instance
metadata or per-execution overrides; the runner script in the VM image
calls back to `/api/internal/worker-callback` with the result.

## Service account permissions

The `gameclaw-l3-runner@...` service account needs:

- `roles/compute.instanceAdmin.v1` — to spin up instances
- `roles/secretmanager.secretAccessor` — for any secrets the worker needs
- `roles/storage.objectCreator` — to upload screenshots to GCS

The platform itself (`gameclaw` Cloud Run service) needs:

- `roles/compute.instanceAdmin.v1` (if dispatching directly)
- `roles/run.developer` (if dispatching via Cloud Run Jobs — only if KVM-less)

## Open work items not in the platform code

1. **Arknights authentication automation** — the runner needs to feed
   credentials into the game. Since users provide Hypergryph tokens, the
   most reliable path is:
   - On worker boot, present a fresh "scan QR to log in" screen
   - Have the runner generate a QR code from the user's stored token via a
     Hypergryph-issued OAuth flow (similar to the existing Skland adapter)
   - The runner consumes the QR via ADB-typing or screen-injection
2. **MAA configuration files** — MAA has per-account JSON configs (which
   stages to farm, infrastructure rotation, etc.). The runner needs to
   either accept these from the API payload or have sane defaults per
   capability.
3. **Vision fallback endpoint** — `/api/internal/worker-vision-help` is
   referenced by the runner but not yet implemented server-side. Pattern:
   - Worker POSTs screenshot + question → server calls Claude vision →
     returns advice (`{action: "click", x: 540, y: 1200}` or `{action: "abort"}`)
4. **Per-game runners for non-Arknights games** — ok-wuwa wrapper for Wuwa,
   March7thAssistant wrapper for Star Rail, etc. Each is its own
   `worker/runner-<slug>/` directory mirroring this one.
5. **Worker telemetry** — metrics on dispatch latency, runner duration,
   success rate per pool. Cloud Monitoring custom metrics.

## Local testing without a real Android emulator

The worker harness (callback API, credentials API, dispatch logic, AI
Verifier, circuit breaker) can be exercised against a **mock worker**:

```bash
# Mock worker that posts a fake success result without booting Android.
cat > /tmp/mock-worker.sh <<'EOF'
#!/usr/bin/env bash
curl -X POST "$CALLBACK_URL/api/internal/worker-callback" \
  -H "Content-Type: application/json" \
  -d "{
    \"taskId\": \"$TASK_ID\",
    \"callbackToken\": \"$CALLBACK_TOKEN\",
    \"status\": \"succeeded\",
    \"message\": \"mock worker complete\",
    \"reward\": \"sanity 240\",
    \"resultData\": {\"mock\": true}
  }"
EOF
```

To dispatch a real task in dev, schedule a T3 capability via `/api/tasks`
with a Pro+ user account; the dispatcher will create a `WorkerJob` row.
Manually run the mock worker pointed at the API and observe the Task row
update.
