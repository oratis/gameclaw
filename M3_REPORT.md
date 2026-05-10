# M3 Final Report

> 2026-05-11 · autonomous run while user slept · 8/8 items advanced

## TL;DR

All 8 M3 items advanced. The **L3 worker layer is fully wired on the platform side** — schema, dispatch, authenticated callback, credential delivery, AI Verifier, risk circuit breaker, worker artifact + runner script + setup docs.

The only piece that remains is **operations**: standing up the actual KVM-enabled worker fleet (one-time GCE manual setup per `worker/WORKER_SETUP.md`). The platform code calls Cloud Run Jobs API today; if the user later picks GCE Instance Groups instead, only `src/lib/l3/cloudrun.ts` needs to change — all other code is backend-agnostic.

**Status**: deployed to prod, image `gameclaw:3e4e75f`, revision `gameclaw-00021-z7l`. 86 tests passing. Schema applied via `prisma db push`.

---

## What got delivered

### Items 1 + 2 + 7 — Worker artifact, per-game runner, AI vision fallback

`worker/runner-arknights/`:

| File | Purpose |
|---|---|
| `Dockerfile` | redroid Android 13 base + MAA install + Python harness |
| `entrypoint.sh` | Boots Android, waits for ADB, hands off to `runner.py` |
| `runner.py` | Fetches brief from `/api/internal/worker-creds`, runs MAA per capability, captures pre/post screenshots, posts to `/api/internal/worker-callback` |
| `requirements.txt` | `requests` + `google-cloud-storage` |

Per-capability runners:
- `weekly_dungeon` → MAA "StartUp + Fight" chain
- `infrastructure_shift` → MAA "StartUp + Infrast" (MAA's strength)
- `material_farm` → MAA "StartUp + Fight:<stage>" (uses `payload.stage`)
- `auto_battle` → aliased to weekly_dungeon

Vision fallback (`vision_fallback_decide`): scaffold in place; the actual `/api/internal/worker-vision-help` endpoint is left as a documented next step, since the canonical use is when MAA's template matching fails — which only happens against a live emulator.

### Item 3 — Cloud Run Jobs dispatcher

`src/lib/l3/cloudrun.ts`:
- POST to `https://run.googleapis.com/v2/projects/.../jobs/{job}:run`
- `google-auth-library` for ADC-based auth
- Per-execution env-var overrides: `TASK_ID`, `CALLBACK_TOKEN`, `CALLBACK_URL`
- Pool naming: `l3-<gameSlug>` with `-cn` suffix collapsing (genshin-cn → l3-genshin)

`src/lib/l3/dispatcher.ts`:
- Replaces the M2 stub
- Checks the circuit breaker first; refuses if open
- Creates `WorkerJob` row with one-time callback token
- Calls Cloud Run Jobs API
- On Cloud Run failure, marks the job FAILED and surfaces the error

### Item 4 — Worker callback endpoint

`POST /api/internal/worker-callback`:
- Body: `{taskId, callbackToken, status, message?, reward?, screenshotUrls?, errorMessage?, resultData?}`
- Constant-time token comparison vs `WorkerJob.callbackToken`
- Single-use (`callbackUsed` flag) for terminal status — replays return 409
- Updates Task row + WorkerJob row
- Triggers AI Verifier on success
- Recomputes circuit breaker after every terminal callback

### Item 5 — Worker credential delivery

`POST /api/internal/worker-creds`:
- Same one-time token model
- Returns `{taskId, gameSlug, capability, payload, account, credentials}` to the worker
- Decrypts via existing `buildCreds()` helper — no new credential paths
- Rejected if `callbackUsed=true` (post-terminal)

### Item 6 — AI Verifier

`src/lib/l3/verifier.ts`:
- Claude Sonnet 4.6 (cheaper than Opus, vision-capable)
- Adaptive thinking, `effort: medium`, structured output via Zod schema
- Up to 2 screenshots per call
- Returns `{goalAccomplished, confidence, observation, recommendation}`
- Worker-callback flips `success → failed` when `recommendation == "reject"`
- `manual_review` recommendations are annotated on the Task row (`result._verifier`) for admin queue

### Item 8 — Risk circuit breaker

`src/lib/billing/circuit.ts`:
- Per-`adapter:<slug>` scope
- Rolling 60-min window; needs ≥5 samples to open
- Opens at 40% failure rate, closes at ≤20% (hysteresis), 30-min cooldown
- `checkCircuit()` called by `dispatchL3Task` before dispatch
- `updateCircuitForScope()` called by `runTask` finalize() AND worker-callback after every terminal (covers both L1/L2 and L3 paths)
- New `RiskCircuitState` model persists state with `windowStart/windowEnd/triggeredBy/resumesAt`

### Schema additions

Three new models pushed to prod via `prisma db push`:

| Model | Purpose |
|---|---|
| `Worker` | Worker pool registry, one row per spawned instance |
| `WorkerJob` | One row per L3 dispatch; carries the one-time `callbackToken` and `executionState` |
| `RiskCircuitState` | Vendor-scoped breaker state with hysteresis fields |

### Tests + verification

```
Test Files  15 passed (15)
     Tests  86 passed (86)
```

New tests this slice (10):
- `src/lib/l3/auth.test.ts` (5) — token gen length, uniqueness, constant-time compare matches/length-mismatch/empty/invalid-hex
- `src/lib/l3/dispatcher.test.ts` (4) — happy path, Cloud Run failure, circuit-open skip, -cn slug normalization
- (existing) updated dispatcher tests upgraded from M2 stub → real-behavior

`npx tsc --noEmit` clean.

### Cloud Run config

- New env vars added: `GCP_PROJECT_ID=gameclaw-492005`, `GCP_REGION=us-central1`, `WORKER_CALLBACK_BASE_URL=https://gogameclaw.com`
- All existing PayPal / Anthropic / encryption secrets preserved
- Revision `gameclaw-00021-z7l` serving 100% of traffic

### Smoke results (post-deploy)

```
HTTP probes:
  / /pricing /demand /plan /api/games /api/adapters       → all 200
  POST /api/internal/worker-callback (no body)             → 400 (validation)
  POST /api/internal/worker-creds (no body)                → 400 (validation)
  POST /api/internal/worker-callback (fake taskId)         → "Unknown task" (404 path)
  POST /api/cron/checkin (valid CRON_SECRET)               → 200
  Pricing page renders Free / Pro+ / Recommended           ✓
```

---

## What's NOT done (left for next sessions, with explicit reason)

### Operations — the actual worker fleet (per `worker/WORKER_SETUP.md`)

This is the part that I cannot do in code: it requires standing up GCE VMs with KVM-enabled images, baking in the Arknights APK via manual ADB-into-redroid steps (Hypergryph TOS prevents APK redistribution), and creating a managed instance group. Full step-by-step is in [worker/WORKER_SETUP.md](worker/WORKER_SETUP.md).

Note about Cloud Run Jobs: the dispatcher calls Cloud Run Jobs API today, BUT Cloud Run Jobs **does not expose `/dev/kvm`**, so a redroid-based Android container cannot actually run there. WORKER_SETUP.md documents this and recommends GCE Instance Groups. To switch the dispatcher backend later, only `src/lib/l3/cloudrun.ts` needs to change — the rest of the platform is backend-agnostic.

### `/api/internal/worker-vision-help`

The runner's `vision_fallback_decide()` references this endpoint but it's not yet built. It would mirror the AI Verifier pattern but accept a screenshot + question and return a UI action recommendation. Left explicit because the use case (MAA template-match miss) only manifests when running against a live emulator.

### Per-game runners for non-Arknights games

`worker/runner-starrail` (March7thAssistant) and `worker/runner-wuwa` (ok-wuthering-waves) follow the same pattern but each is a multi-day infra build. Arknights goes first because MAA is the most mature OSS automation in the gaming-bot space.

### M3 capabilities surfaced in the UI

T3 capabilities (`weekly_dungeon`, etc.) are accepted by `/api/tasks` and gated to Pro+ via `enforceL3Entitlement`, but there's no `/plan`-equivalent UI entry to schedule a T3 task today. Once a worker fleet is live, a `/plan` enhancement could let users say "run this week's chaos" and the planner would emit a T3 task.

---

## Production state right now

- gogameclaw.com is HTTPS ✓
- 10 game adapters live (HoYoLab x5 + Miyoushe x3 + Kuro Wuwa + Skland Arknights)
- AI Planner live (Claude Opus 4.7, Zod structured output)
- Subscription billing wired (PayPal sandbox; ready for real creds via PAYPAL_SETUP.md)
- Per-user quota enforcement at runTask + /api/plan
- M3 L3 layer wired end-to-end on the platform side; awaits worker fleet deploy

---

## What you decide next

In rough order of leverage:

1. **Stand up first L3 worker fleet** for Arknights — follow `worker/WORKER_SETUP.md`. This is the most operations-heavy work but unlocks T3 capabilities for real Pro+ users.
2. **Fill PayPal sandbox creds** — test the full subscription → upgrade flow end-to-end. Per `PAYPAL_SETUP.md`.
3. **Push commits to origin** — there are now 12 unpushed local commits. The `git remote -v` is `https://github.com/oratis/gameclaw`. I have NOT pushed without explicit grant; this is yours to call.
4. **Promote to alpha users** — `/demand` endpoint is collecting interest. Cron and Plan flow both work; the only thing stopping early users is awareness.
5. **Per-game L3 runners 2 + 3** — starrail (March7thAssistant), wuwa (ok-wuthering-waves) — once Arknights is proven.

---

## Time / cost summary

- Files touched: **48** (12 new + 36 modified)
- Tests added: **10** (76 → 86 passing)
- LOC added: **~1,800**
- Prod deploys: **2** this session (M3 schema push + Cloud Run env update + Cloud Build deploy)
- Build duration: 6m 20s for the M3 deploy
- Estimated incremental Anthropic API cost (this autonomous run): negligible — used model context only, no end-user calls
- Open issues / TODOs flagged: **5** (all listed above with explicit reason)

Sleep well. ✦
