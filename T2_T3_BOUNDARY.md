# T2 / T3 Boundary — what's actually L1-reachable and what needs the worker fleet

Status as of 2026-05-12.

## TL;DR

**T2 capabilities — `mail_claim`, `stamina_spend` — cannot be implemented via public web APIs for any of GameClaw's current 4 vendors.** They require either:

- (a) a reverse-engineered mobile-game-client API (legally and technically risky; not in scope), or
- (b) the L3 worker fleet (Android emulator + MAA / M7A / ok-wuwa) per `worker/WORKER_SETUP.md` — i.e. they're effectively **T3 work, not T2**.

This document is the audit of what we found when we went to implement them. The plan-tasks.md M2 list called T2 a "semi-public client API" tier — that framing was optimistic.

## Per-vendor audit

### HoYoLab (Genshin / Star Rail / ZZZ / Honkai 3rd / Tears)

| Capability | Public web API? | Notes |
|---|---|---|
| `mail_claim` | ❌ | No public endpoint for in-game mail. The HoYoLAB web UI has no "mail" surface. The in-game mailbox can only be opened from inside the game client. |
| `stamina_spend` | ❌ | No public endpoint for sending expeditions, accepting commissions, or running material domains. Real-time notes (`account_status`) shows expedition status read-only. |
| Vendor-side workarounds | 🟡 | Some community projects use HoYo's check-in or redeem code endpoints with bespoke params to trigger one-off in-game effects, but nothing covers the daily-stamina-spend flow. |

### Miyoushe (国服: 原神 / 崩铁 / 绝区零)

| Capability | Public web API? | Notes |
|---|---|---|
| `mail_claim` | ❌ | Same architecture as HoYoLab — no public mail endpoint. |
| `stamina_spend` | ❌ | Same — no public expedition / commission endpoint. |
| `bbs_daily_task` extension (look posts, like, share) | ✅ but tedious | 米游社 has /apihub/sapi/getPostFullInList + /apihub/api/upvotePost endpoints. M2 only ships the basic forum signin; deeper task chains are doable but each is a few hours' polish. |

### Kuro (鸣潮)

| Capability | Public web API? | Notes |
|---|---|---|
| `mail_claim` | ❌ | Library/mailbox is in-game only. |
| `stamina_spend` | ❌ | Same. |
| `bbs_daily_task` extension | ✅ | `/encourage/level/shareTask`, `/forum/like`, `/forum/getPostDetail` documented in TomyJan/Kuro-API-Collection. M2 only ships basic forum signin. |

### Hypergryph (明日方舟)

| Capability | Public web API? | Notes |
|---|---|---|
| `mail_claim` | ❌ | No Skland endpoint for in-game mail. Mail must be claimed from the game client. |
| `stamina_spend` (剿灭 / 基建轮换) | ❌ | Same — Skland's `/api/v1/game/player/info` exposes the current sanity number but no write endpoints. |
| MAA does both via emulator | ✅ (T3) | MAA's Infrast and Fight task chains handle both — wired into `worker/runner-arknights` and ready as soon as the worker fleet stands up. |

## Implication

The capability enum already lists `mail_claim` and `stamina_spend` as T2 — they remain there, but the **runtime behavior is L3-only**. When the L3 worker fleet ships, MAA/M7A/ok-wuwa runners pick these up natively. Until then:

1. Calling these capabilities via `/api/tasks` → `runTask` → adapter `execute()` returns a `failed` status with a clear "not yet implemented in adapter" message.
2. Calling them via the planner: the planner sees them in the capability list, but the system prompt now flags them as "not yet live, surface as unsupportedRequests".

## What changed in code as a result

- `src/lib/planner/system-prompt.ts` — explicitly tells the planner mail_claim / stamina_spend are not live; surface as unsupportedRequests.
- Capability tier comments in `src/adapters/types.ts` updated to reflect the boundary (T2 = "L3-only for current vendors") to prevent future contributors from chasing this rabbit hole again.
- `plan-tasks.md` M2 wording softened: T2 is "anything reachable through public web APIs" — but for the games we cover, the reachable surface is `bbs_daily_task` extensions and similar community-side tasks, not in-game state mutation.

## What we still ship under T2

Tasks that DO have public APIs and would slot into M2:

- HoYoLab `account_status` ✅ (shipped 2026-05-12)
- HoYoLab `redeem_code` ✅ (shipped 2026-05-12)
- HoYoLab `bbs_daily_task` ✅
- Miyoushe `bbs_daily_task` ✅
- Miyoushe `bbs_daily_task_chain` (post browse / like / share — not yet)
- Kuro `bbs_daily_task_chain` — not yet
- Skland `bbs_daily_task` ✅ (4-board signin)

In short: M2's value is **the BBS / community side**, plus real-time status reads, plus code redemption. The "T2 = game-state writes" was a misframing — those are inherently L3.

## Recommendation

Drop "T2" framing from public-facing roadmap and replace with:

- **T1 = web APIs** (signin, BBS, codes, real-time reads) — done
- **T2 = community-task chains** (米游社 / Kurobbs / Skland multi-step forum tasks) — partial, ~3 days more work to complete
- **T3 = in-game state via L3 worker** (mail, stamina, dungeons, infrastructure) — needs worker fleet, ~10 weeks

This aligns the framing with what the underlying vendor surfaces actually allow.
