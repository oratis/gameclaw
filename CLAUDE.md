# GameClaw

## Project Overview

GameClaw is a Next.js 16 cross-vendor AI game-boost platform. Originally HoYoLAB-only signin tool, now a universal AI 代练 platform spanning 4 vendors / 10 games with AI Planner, subscription billing, weekly reporting, and an architectural L3 vision-worker layer (worker fleet itself is manual ops).

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript, tsconfig target=ES2020 for BigInt)
- **Auth:** NextAuth.js v5 (Google, Apple, Credentials)
- **Database:** PostgreSQL (Cloud SQL via Unix socket) + Prisma v6
- **i18n:** next-intl (cookie-based, 4 locales: en/zh/ja/ko)
- **Styling:** Tailwind CSS v4
- **LLM:** `@anthropic-ai/sdk` (Opus 4.7 planner, Sonnet 4.6 vision, Haiku 4.5 reporter)
- **Billing:** PayPal Subscriptions REST via `google-auth-library`-free thin wrapper
- **Cloud Ops:** Google Cloud Run (project: gameclaw-492005) + Cloud Build + Cloud Scheduler + Secret Manager + Cloud SQL

## Architecture map

```
src/
├── adapters/                # Game adapters — one slug per game
│   ├── hoyolab.ts          # 5 international HoYo games
│   ├── miyoushe.ts         # 3 CN HoYo games
│   ├── kuro.ts             # 鸣潮
│   ├── skland.ts           # 明日方舟
│   ├── types.ts            # GameAdapter contract, Capability enum
│   └── index.ts            # Registry (getAdapter, hasAdapter, listAdapters)
├── lib/
│   ├── adapters/...        # Helpers shared across adapters
│   ├── billing/            # Tier config, quota check, PayPal client, risk circuit
│   ├── credentials.ts      # encrypt/decrypt + buildCreds(account)
│   ├── encryption.ts       # AES-256-GCM + encryptJSON/decryptJSON
│   ├── hoyolab/            # HoYoLab client, signing, capability implementations
│   ├── kuro/               # Kurobbs client + token signing
│   ├── miyoushe/           # 米游社 client (cookie_token_v2 + account_id_v2)
│   ├── skland/             # Hypergryph token → OAuth → cred + HMAC sign
│   ├── l3/                 # L3 worker auth, dispatcher (Cloud Run Jobs),
│   │                       # circuit-aware verifier (Claude vision)
│   ├── planner/            # AI Planner (Claude Opus 4.7 + Zod structured output)
│   ├── reporter/           # AI weekly Reporter (Claude Haiku 4.5)
│   ├── tasks/runner.ts     # Single chokepoint runTask() with quota +
│   │                       # L3 entitlement enforcement
│   ├── usage/meter.ts      # Monthly UsageMeter increments
│   └── util/ratelimit.ts   # In-memory per-IP rate limiter (Cloud Run-aware)
├── app/
│   ├── api/
│   │   ├── tasks/          # Generic task runner POST
│   │   ├── plan/           # /api/plan (POST) + /api/plan/execute (POST)
│   │   ├── templates/      # TaskTemplate CRUD + /run
│   │   ├── report/weekly/  # AI weekly digest GET
│   │   ├── billing/        # subscribe / cancel
│   │   ├── webhooks/paypal/# PayPal webhook receiver (idempotent)
│   │   ├── internal/       # worker-callback / worker-creds / worker-vision-help
│   │   │                   # — auth via WorkerJob.callbackToken
│   │   ├── adapters/       # Registry metadata for UI
│   │   ├── demand/         # Public demand signal (rate-limited)
│   │   ├── cron/checkin/   # Cloud Scheduler bearer-auth daily cron
│   │   ├── user/accounts/  # Link account, list accounts
│   │   └── games/[gameId]/status/ # Per-game checkin info
│   ├── (main)/            # Auth-gated routes (Header + Footer)
│   │   ├── dashboard/     # Accounts + tasks + templates + report
│   │   ├── plan/          # AI Planner UI
│   │   ├── accounts/link/ # Dynamic-form vendor-aware account linking
│   │   └── settings/billing/ # Tier + usage + PayPal subscribe/cancel
│   ├── pricing/           # Public marketing page
│   ├── demand/            # Public demand-collection form
│   └── games/             # Public catalog + per-game detail
└── i18n/
    └── messages/{en,zh,ja,ko}.json
worker/
└── runner-arknights/      # L3 worker (Dockerfile + runner.py + entrypoint.sh)
```

## Local Development

```bash
npm install
npx prisma generate
npx prisma db push        # against your local DB
npm run dev               # NEXTAUTH_URL=http://localhost:3000

# Schema push to prod (rare, only after schema.prisma changes):
# 1. cloud-sql-proxy --port 5433 --credentials-file ~/.config/gcloud/legacy_credentials/<user>/adc.json gameclaw-492005:us-central1:gameclaw-db
# 2. DATABASE_URL="postgresql://postgres:$(gcloud secrets versions access latest --secret=GAMECLAW_DATABASE_URL | sed 's|.*postgres:||;s|@.*||')@localhost:5433/gameclaw" npx prisma db push --skip-generate
```

## Database

Local dev uses an existing PostgreSQL container (`localhost:5432`, user `takoapi`, password `takoapi_dev`).

Prod is Cloud SQL `gameclaw-492005:us-central1:gameclaw-db` accessed via Unix socket from Cloud Run. The secret `GAMECLAW_DATABASE_URL` in Secret Manager has the current connection string.

## Conventions

- Dark theme (gray-950 bg, emerald-400/500 accent)
- Cookie-based i18n (NEXT_LOCALE cookie, no URL prefix)
- JWT session strategy (required for Credentials provider)
- Game credentials encrypted at rest with AES-256-GCM (`encryption.ts`)
- Single chokepoint: every adapter execution goes through `runTask()` in `src/lib/tasks/runner.ts` — quota and L3 entitlement are enforced there, ONE place.
- All Anthropic SDK calls follow `claude-api` skill: default `claude-opus-4-7`, adaptive thinking, prompt caching on stable prefixes, no `temperature`/`top_p`/`budget_tokens`.

## Adding a new game adapter

See [src/adapters/README.md](src/adapters/README.md). Short version:
1. Write `src/lib/<vendor>/{client,checkin,...}.ts` with the HTTP plumbing
2. Wrap in `src/adapters/<vendor>.ts` implementing `GameAdapter`
3. Register in `src/adapters/index.ts`
4. UI surfaces (`/games`, `/accounts/link`, `/plan`) auto-pick up via `/api/adapters`

## Adding a new capability

1. Add to `Capability` union in `src/adapters/types.ts`
2. Add to `ALL_CAPABILITIES` set in `src/app/api/tasks/route.ts`
3. Add to `CAPABILITIES` tuple in `src/lib/planner/schema.ts`
4. If L3-only, add to `L3_CAPABILITIES` in `src/lib/billing/quota.ts`
5. Implement in the relevant adapter(s) — case in `execute()` switch

## Deployments

- `gcloud builds submit --config cloudbuild.yaml` triggers Docker build + Cloud Run deploy
- Cron is `gameclaw-daily-checkin` in Cloud Scheduler (`0 1 * * *` Asia/Shanghai), Bearer `$CRON_SECRET`
- Worker fleet (M3) — see [worker/WORKER_SETUP.md](worker/WORKER_SETUP.md). Platform-side is wired and deployed; the actual Android/MAA workers are manual ops install.
