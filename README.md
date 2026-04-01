# GameClaw

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Automate your daily gaming rewards. GameClaw is an open-source platform and OpenClaw AI skill for automating HoYoLAB daily check-ins across all HoYoverse games.

## Features

- **Auto Daily Check-in** — Automatically claim daily rewards for all linked HoYoverse games
- **Multi-Game Support** — Genshin Impact, Honkai: Star Rail, Zenless Zone Zero, Honkai Impact 3rd, Tears of Themis
- **OpenClaw AI Skill** — Use as an AI skill in Claude to manage check-ins via natural language
- **Secure** — Game credentials encrypted at rest with AES-256-GCM
- **Multi-Language** — English, Chinese, Japanese, Korean
- **Responsive** — Works on desktop and mobile
- **Open Source** — MIT licensed, fully transparent

## Supported Games

| Game | Slug | Daily Rewards |
|------|------|---------------|
| Genshin Impact | `genshin` | Primogems, Mora, materials |
| Honkai: Star Rail | `starrail` | Stellar Jade, credits |
| Zenless Zone Zero | `zzz` | Polychrome, materials |
| Honkai Impact 3rd | `honkai3rd` | Crystals, materials |
| Tears of Themis | `tears` | S-Chips, materials |

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- npm

### Local Development

```bash
# Clone the repository
git clone https://github.com/gameclaw/gameclaw.git
cd gameclaw

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Generate Prisma client and run migrations
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

Visit http://localhost:3000

### Docker

```bash
docker-compose up -d
```

## OpenClaw Skill

### Installation

```bash
# Via ClawHub
clawhub install gameclaw

# Or manually
cp -r gameclaw_skill ~/.claude/skills/gameclaw
```

### Usage

```
/gameclaw checkin all          # Check in to all games
/gameclaw checkin genshin      # Check in to Genshin Impact
/gameclaw status genshin       # View check-in status
/gameclaw games                # List supported games
```

### Standalone Scripts

```bash
cd gameclaw_skill/scripts
pip install -r requirements.txt

# Check-in
python hoyolab_checkin.py --ltoken "YOUR_TOKEN" --ltuid "YOUR_UID" --game genshin

# Account info
python account_status.py --ltoken "YOUR_TOKEN" --ltuid "YOUR_UID"
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_URL` | Application URL (http://localhost:3000) |
| `NEXTAUTH_SECRET` | NextAuth secret key |
| `AUTH_TRUST_HOST` | Set to `true` for production |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `APPLE_CLIENT_ID` | Apple Sign-In client ID |
| `APPLE_CLIENT_SECRET` | Apple Sign-In client secret |
| `ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM |

## Deployment

GameClaw is designed for Google Cloud Run deployment.

```bash
# Build and deploy
gcloud builds submit --config cloudbuild.yaml

# Map custom domain
gcloud run domain-mappings create --service gameclaw --domain gogameclaw.com --region us-central1
```

**Google Cloud project:** `gameclaw-492005`

## API Reference

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/games` | List supported games | No |
| POST | `/api/auth/register` | Register account | No |
| GET | `/api/user/accounts` | List linked accounts | Yes |
| POST | `/api/user/accounts` | Link game account | Yes |
| POST | `/api/checkin` | Check in all games | Yes |
| POST | `/api/checkin/:gameId` | Check in specific game | Yes |
| GET | `/api/checkin/history` | Check-in history | Yes |
| POST | `/api/agent` | Agent API for skill | Yes |

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Auth:** NextAuth.js v5 (Google, Apple, Credentials)
- **Database:** PostgreSQL + Prisma ORM
- **i18n:** next-intl
- **Styling:** Tailwind CSS v4
- **Deployment:** Google Cloud Run
- **Language:** TypeScript

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
