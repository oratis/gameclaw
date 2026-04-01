# GameClaw

## Project Overview
GameClaw is a Next.js 16 app + OpenClaw skill for automating HoYoLAB daily check-ins across all HoYoverse games (Genshin Impact, Honkai: Star Rail, ZZZ, Honkai 3rd, Tears of Themis).

## Tech Stack
- **Framework:** Next.js 16 (App Router, TypeScript)
- **Auth:** NextAuth.js v5 (Google, Apple, Credentials)
- **Database:** PostgreSQL + Prisma v6
- **i18n:** next-intl (cookie-based, 4 locales: en/zh/ja/ko)
- **Styling:** Tailwind CSS v4
- **Deployment:** Google Cloud Run (project: gameclaw-492005)

## Key Directories
- `src/lib/hoyolab/` — HoYoLAB API client, check-in logic, constants
- `src/lib/auth.ts` — NextAuth configuration
- `src/lib/encryption.ts` — AES-256-GCM for game cookie storage
- `src/i18n/` — Locale config and message files
- `gameclaw_skill/` — OpenClaw skill (SKILL.md + Python scripts)

## Development
```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

## Database
Local dev uses the existing PostgreSQL container at localhost:5432 (user: takoapi, password: takoapi_dev).

## Conventions
- Dark theme (gray-950 bg, emerald-400/500 accent)
- Cookie-based i18n (NEXT_LOCALE cookie, no URL prefix)
- JWT session strategy (required for Credentials provider)
- Game cookies encrypted at rest with AES-256-GCM
