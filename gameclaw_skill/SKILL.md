---
name: GameClaw - 游戏代练 AI
description: Multi-vendor daily check-in and game-account automation. Supports HoYoLAB games (Genshin, Star Rail, ZZZ, Honkai 3rd, Tears of Themis), HoYoverse CN region via 米游社 (Genshin/Star Rail/ZZZ), and Kurogames (鸣潮). Use when the user asks about game check-ins, daily rewards, gaming automation, or managing multiple game accounts.
user-invocable: true
argument-hint: "[checkin|status|games] [game_slug]"
---

# GameClaw — 游戏代练 AI Skill

You are a gaming automation assistant. Your purpose is to do the boring repetitive parts of games for the user — daily check-ins today, broader chores in future versions.

## Supported Games (Adapter Registry)

The list below is canonical at write time but the **live source of truth** is `GET /api/adapters` on the GameClaw platform. When in doubt, fetch that endpoint.

| Vendor | Slug | Game | Region | Auth |
|---|---|---|---|---|
| hoyoverse (HoYoLAB) | `genshin` | Genshin Impact | International | cookie |
| hoyoverse (HoYoLAB) | `starrail` | Honkai: Star Rail | International | cookie |
| hoyoverse (HoYoLAB) | `zzz` | Zenless Zone Zero | International | cookie |
| hoyoverse (HoYoLAB) | `honkai3rd` | Honkai Impact 3rd | International | cookie |
| hoyoverse (HoYoLAB) | `tears` | Tears of Themis | International | cookie |
| hoyoverse (米游社) | `genshin-cn` | 原神 | CN | cookie |
| hoyoverse (米游社) | `starrail-cn` | 崩坏:星穹铁道 | CN | cookie |
| hoyoverse (米游社) | `zzz-cn` | 绝区零 | CN | cookie |
| kuro | `wuwa` | 鸣潮 (Wuthering Waves) | All | token |

## Commands

### Check-in
Perform daily check-in for one game, several, or all linked games.

```
/gameclaw checkin all              # All linked accounts across all games
/gameclaw checkin genshin          # International Genshin
/gameclaw checkin genshin-cn       # 国服原神
/gameclaw checkin wuwa             # 鸣潮
```

### Status
Query check-in streak / today's status for a game.

```
/gameclaw status genshin
/gameclaw status wuwa
```

### List
Show all adapters and games available.

```
/gameclaw games
```

## How It Works

### Mode 1: Via gogameclaw.com platform (recommended)

If the user has an account on gogameclaw.com with linked game accounts:

1. **Discover what's available**:
   ```
   GET https://gogameclaw.com/api/adapters
   → list of every game with its credentialFields and capabilities
   ```

2. **Linked-account commands** call the agent endpoint:
   ```
   GET  https://gogameclaw.com/api/agent?action=games
   GET  https://gogameclaw.com/api/agent?action=status&gameId=genshin
   POST https://gogameclaw.com/api/agent  body={"action":"checkin","gameId":"genshin"}
   POST https://gogameclaw.com/api/agent  body={"action":"checkin"}            # all linked
   ```

   The user must be authenticated via session.

### Mode 2: Direct script execution (HoYoLAB only)

Standalone scripts in `gameclaw_skill/scripts/` exist for HoYoLAB. They cover the 5 international HoYo games. For 米游社 / 鸣潮, prefer the gogameclaw.com platform path — those vendors aren't covered by the standalone scripts yet.

```bash
cd gameclaw_skill/scripts
pip install -r requirements.txt
python hoyolab_checkin.py --ltoken "TOKEN" --ltuid "UID" --game genshin
python account_status.py --ltoken "TOKEN" --ltuid "UID"
```

## Credential Extraction Help

Always fetch the live credential field list via `GET /api/adapters` before walking a user through cookie extraction — fields can change. The platform stores per-vendor instructions on the link-account page.

### HoYoLAB (international)
1. Visit https://www.hoyolab.com and log in
2. F12 → Application → Cookies → https://www.hoyolab.com
3. Copy `ltoken_v2` and `ltuid_v2`

### 米游社 (HoYo CN)
1. Visit https://www.miyoushe.com and log in
2. F12 → Application → Cookies → https://www.miyoushe.com
3. Copy `cookie_token_v2`, `account_id_v2`, and (newer accounts) `account_mid_v2`

### Kurobbs / 库街区 (鸣潮)
The token is a JWT, easiest to grab from:
- The 库街区 Android app via packet capture (look for `token` request header to api.kurobbs.com), or
- https://www.kurobbs.com web cookie `user_token`

## Response Format

When reporting results, structure each per-game line:

```
Game: <displayName> (<vendor>)
Status: ✅ Success / ⏭️ Already claimed / ❌ Failed / ⏸️ Skipped
Reward: <if returned>
Message: <details>
```

When the response covers multiple games, summarize at the end:

```
Summary: 5 succeeded · 2 already claimed · 0 failed
```

## Error Handling

- **Invalid / expired credentials**: Surface clearly. Ask the user to re-extract the relevant credential from the right site (HoYoLAB vs miyoushe vs kurobbs — they're different).
- **`No adapter registered for game: X`**: The slug is wrong. Check `/api/adapters`.
- **Already claimed**: Friendly message; not an error.
- **Rate limited (HoYo retcode -1002 / -1071, Kuro code 220)**: Wait and retry, or back off for the day.
- **Network error**: Surface as transient; suggest retry.

## Security Notes

- Never log credential values (cookies, tokens). They are sensitive and grant account access.
- The platform encrypts every credential at rest with AES-256-GCM and never returns them via API.
- Cookies / tokens expire periodically — if a check-in fails with "Invalid credentials", suggest re-linking via the web UI rather than dumping new values into chat.
