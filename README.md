# GameClaw — AI 游戏代练 · Universal AI Game Boost

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> AI plays the boring parts of every game for you. Daily check-ins today, dailies / mail / dungeons next. Cross-vendor across HoYoverse, 米游社, Kurogames (鸣潮), and Hypergryph (明日方舟).

## What it does

- **10+ games across 4 vendors**, one unified adapter system. Add a new game = write one `src/adapters/<vendor>.ts` file.
- **AI Planner** — describe what you want in plain language (zh/en/ja/ko); Claude Opus 4.7 emits an executable plan, you preview, you run.
- **Daily routines** — save any plan as a `TaskTemplate` and re-run on demand or via cron.
- **Capability layers**:
  - **T1 (live)**: check-in, BBS daily, redeem code, real-time game status (resin / power / battery)
  - **T2 (in progress)**: mail claim, stamina dispatch
  - **T3 (M3 platform-side ready, worker fleet manual)**: weekly dungeon, infrastructure shift, material farm — Pro+ only
- **AI Weekly Reporter** — Haiku 4.5 summarizes your week of activity into a friendly digest
- **PayPal subscription billing** — Free / Pro $5 / Pro+ $15 / Enterprise tiers, real per-user monthly quota enforcement
- **L3 worker fleet** — Cloud Run Jobs dispatch + AI Verifier (Claude vision on screenshots) + per-vendor risk circuit breaker

## Supported games

| Vendor | Slug | Game |
|---|---|---|
| HoYoLAB (intl) | `genshin` | Genshin Impact |
| HoYoLAB (intl) | `starrail` | Honkai: Star Rail |
| HoYoLAB (intl) | `zzz` | Zenless Zone Zero |
| HoYoLAB (intl) | `honkai3rd` | Honkai Impact 3rd |
| HoYoLAB (intl) | `tears` | Tears of Themis |
| 米游社 (CN) | `genshin-cn` | 原神 |
| 米游社 (CN) | `starrail-cn` | 崩坏:星穹铁道 |
| 米游社 (CN) | `zzz-cn` | 绝区零 |
| Kurogames | `wuwa` | Wuthering Waves (鸣潮) |
| Hypergryph | `arknights` | Arknights (明日方舟) |

## Capabilities matrix

| Capability | HoYoLab | Miyoushe | Kuro | Skland | Tier |
|---|---|---|---|---|---|
| `checkin` | ✅ | ✅ | ✅ | ✅ | T1 |
| `checkin_info` | ✅ | ✅ | — | — | T1 |
| `list_accounts` | ✅ | ✅ | ✅ | ✅ | T1 |
| `bbs_daily_task` | ✅ | ✅ | ✅ | ✅ (4 boards) | T1 |
| `redeem_code` | ✅ (Genshin/StarRail/ZZZ) | — | — | — | T1 |
| `account_status` | ✅ (real-time notes) | — | — | — | T1 |
| `mail_claim` | — | — | — | — | T2 (next) |
| `stamina_spend` | — | — | — | — | T2 (next) |
| `weekly_dungeon` / `infrastructure_shift` / `material_farm` / `auto_battle` | — | — | — | scaffolded | T3 (M3, Pro+ only) |

## Quick start (self-host)

```bash
git clone https://github.com/oratis/gameclaw.git
cd gameclaw
npm install
cp .env.example .env  # fill in DATABASE_URL, NEXTAUTH_SECRET, ENCRYPTION_KEY, ANTHROPIC_API_KEY
npx prisma generate
npx prisma db push
npm run dev
```

Visit http://localhost:3000.

## Docs

| File | What |
|---|---|
| [plan.md](plan.md) | Strategic roadmap M0 → M4 |
| [plan-tasks.md](plan-tasks.md) | Deep dive on the generic task system + worker tiers |
| [PAYPAL_SETUP.md](PAYPAL_SETUP.md) | How to bring real PayPal billing live |
| [worker/WORKER_SETUP.md](worker/WORKER_SETUP.md) | How to deploy the L3 vision-worker fleet |
| [M3_REPORT.md](M3_REPORT.md) | What landed during the M3 push |
| [src/adapters/README.md](src/adapters/README.md) | How to add a new game adapter |

## Tech

- Next.js 16 App Router · TypeScript · Tailwind v4 · next-intl (en/zh/ja/ko)
- Auth: NextAuth.js v5 (Google, Apple, Credentials)
- Database: PostgreSQL + Prisma ORM (Cloud SQL in prod)
- Encryption: AES-256-GCM at rest, Secret Manager for service keys
- Deployment: Google Cloud Run + Cloud Build + Cloud Scheduler
- LLM: `@anthropic-ai/sdk` with prompt caching (Opus 4.7 for planner, Sonnet 4.6 for vision verifier, Haiku 4.5 for reporter)
- Billing: PayPal Subscriptions API + monthly UsageMeter

## License

MIT — see [LICENSE](LICENSE).
