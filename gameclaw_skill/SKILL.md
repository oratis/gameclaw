---
name: GameClaw - AI 游戏代练
description: Universal AI game-boost platform. Daily check-ins, BBS forum tasks, gift codes, real-time game state (resin/stamina/battery), and natural-language task planning across 10+ games (HoYoLAB Genshin/Star Rail/ZZZ/Honkai 3rd/Tears, 米游社 CN versions of HoYo games, Kurogames 鸣潮, Hypergryph 明日方舟). Use when the user asks about daily rewards, in-game maintenance tasks, gift codes, game status, or wants AI to plan and run a multi-game routine.
user-invocable: true
argument-hint: "[plan <natural language> | run <slug> <capability> | status <slug> | redeem <slug> <code> | report]"
---

# GameClaw — AI 游戏代练 Skill

You help the user manage daily reward automation and game-account state across 10+ games via the GameClaw platform.

The primary surface is **AI Planner** (`/api/plan`) — give it the user's request in their language, get back a structured plan of (slug, capability) tasks to execute. For known-specific commands you can also call individual capabilities directly.

## Live capabilities

Always trust **`GET /api/adapters`** for the current list — adapters and capabilities evolve. As of M2-3 (2026-05):

| Capability | What it does | Where it works |
|---|---|---|
| `checkin` | Daily game-side check-in (idempotent) | All 10 adapters |
| `checkin_info` | Streak / today's status | HoYoLab x5, Miyoushe x3 |
| `account_status` | Real-time game state: resin / power / battery | HoYoLab Genshin, StarRail, ZZZ |
| `bbs_daily_task` | Forum / community-side signin | All 10 adapters |
| `redeem_code` | Exchange gift code for rewards | HoYoLab Genshin, StarRail, ZZZ |
| `list_accounts` | Diagnostic: enumerate bound game accounts | All 10 |

T2 / T3 capabilities (`mail_claim`, `stamina_spend`, `weekly_dungeon`, etc.) are scaffolded but require either reverse-engineered client APIs or L3 worker fleet (M3); they return clear "not yet available" if scheduled.

## Mode 1 — Via gogameclaw.com platform (preferred)

If the user has a gogameclaw.com account with linked games, the cleanest flow is via natural language:

### Natural language → Plan → Execute

```
1. POST https://gogameclaw.com/api/plan
   body: {"prompt": "<user's request>", "locale": "<bcp47>"}
   ↓ returns: { plan: {reasoning, tasks: [...], unsupportedRequests: [...]}, usage }

2. Show the user the proposed tasks + reasoning.
3. POST https://gogameclaw.com/api/plan/execute
   body: { tasks: <plan.tasks> }
   ↓ returns: { results: [{gameSlug, capability, status, message, reward?}] }
```

The streaming variant `POST /api/plan/stream` returns Server-Sent Events; consume if the user wants live progress.

### Specific direct invocations

For known single tasks, skip the planner:

```
POST https://gogameclaw.com/api/tasks
body: { gameSlug: "wuwa", capability: "checkin" }
  or  { tasks: [{gameSlug, capability, params?}, ...] }

GET https://gogameclaw.com/api/agent?action=status&gameId=genshin
GET https://gogameclaw.com/api/games/<slug>/status
```

### Save a recurring routine

After a successful Plan + Execute, the user can save the steps as a TaskTemplate to re-run later:

```
POST https://gogameclaw.com/api/templates
body: { name: "My daily routine", steps: <plan.tasks> }

POST https://gogameclaw.com/api/templates/<id>/run   # run it now
GET  https://gogameclaw.com/api/templates             # list mine
DELETE /api/templates/<id>                            # delete
```

### Weekly report

```
GET https://gogameclaw.com/api/report/weekly?days=7&locale=zh
```

Returns Markdown digest of the user's activity. Use to answer questions like "how did my dailies go last week?".

## Mode 2 — Standalone Python scripts (HoYoLAB only)

If the user is NOT on gogameclaw.com OR they prefer local execution and have their HoYoLAB cookies handy, fall back to the legacy scripts:

```bash
pip install -r gameclaw_skill/scripts/requirements.txt
python gameclaw_skill/scripts/hoyolab_checkin.py --ltoken "$LT" --ltuid "$LU" --game genshin
python gameclaw_skill/scripts/account_status.py --ltoken "$LT" --ltuid "$LU"
```

Standalone only covers `checkin` for HoYoLab. For everything else (米游社, Kuro, Skland; account_status; redeem_code; cross-vendor planning) use the platform path.

## Credential extraction guide (when user asks)

Always tell users to copy from the actual site they'll use:

- **HoYoLAB international**: hoyolab.com → F12 → Application → Cookies → `ltoken_v2` + `ltuid_v2`
- **米游社 国服**: miyoushe.com → F12 → Cookies → `cookie_token_v2` + `account_id_v2` (+ `account_mid_v2` for newer accounts)
- **库街区 (Kurobbs)**: easiest from the Android app via packet capture (look for `token` header to api.kurobbs.com); web alternative — `user_token` cookie at kurobbs.com
- **森空岛 (Skland / Arknights)**: log in to web.skland.com → fetch `as.hypergryph.com/user/info/v1/basic`, copy `data.token`

Never paste credentials into the chat. Tell users to use the link-account UI at `/accounts/link` which stores them encrypted (AES-256-GCM at rest).

## Result formatting

Render each task on its own line:
```
✅ Genshin Impact (genshin) — checkin: signed in, today=2026-05-12
⏭️  Arknights (arknights) — bbs_daily_task: already done today
⚠️  Star Rail (starrail) — redeem_code: invalid code
```

For a Plan execution, end with a single summary line:
```
Summary: 5 succeeded · 2 already done · 1 failed
```

## Error handling

- **401**: User isn't signed in. Direct them to sign in at gogameclaw.com/signin first.
- **402 `code: "quota_exceeded"`**: User hit Free tier's monthly task or plan-call limit. Suggest upgrading (`/pricing`) — note Pro+ has 5× the Plan budget.
- **`code: "l3_not_entitled"`**: A T3 (副本 / 上分) capability needs Pro+ subscription.
- **429**: Rate-limited (e.g. `/api/demand` is 5/hour/IP).
- **`code === 0` but message ≈ "already signed"**: Idempotent success — present as ⏭️ Already done.
- **"Invalid credentials"** in result: Direct user to re-link account at `/accounts/link`.

## Security

- Never log full cookies, tokens, or PayPal IDs to chat.
- The platform handles encryption — your job is only to relay requests + format results.
- If a user pastes a real credential into chat, recommend they revoke it and re-link via the web UI.
