# Game Adapters

Adapters are how GameClaw supports many games. Each adapter is **one game**: it knows how to validate credentials and execute tasks (check-in, mail claim, ...) for that game.

## Contract

Implement [`GameAdapter`](./types.ts):

```ts
interface GameAdapter {
  slug: string;            // "genshin", "wuwa", "arknights"
  vendor: string;          // "hoyoverse", "kuro", "yostar"
  displayName: string;
  authMethod: "cookie" | "oauth" | "token";
  credentialFields: CredentialField[];
  capabilities: Capability[];

  verify(creds): Promise<AccountInfo[]>;
  execute(task, creds): Promise<TaskResult>;
}
```

Adapters are **stateless**. Credentials come in per call; nothing about the user is stored on the adapter.

## How to add a new game

1. Create `src/adapters/<vendor>.ts`. If the vendor already has a file (e.g. `hoyolab.ts` covers 5 HoYo games), add to it.
2. Implement `GameAdapter`. Wrap the underlying HTTP client in your own helper or reuse one.
3. Register in [`src/adapters/index.ts`](./index.ts):
   ```ts
   import { WUWA_ADAPTER } from "./wuwa";
   const REGISTRY = { ...HOYOLAB_ADAPTERS, [WUWA_ADAPTER.slug]: WUWA_ADAPTER };
   ```
4. Add tests next to the file: `src/adapters/<vendor>.test.ts`.
5. Update `prisma/schema.prisma` if the game needs new credential fields the existing `GameAccount` model can't hold (try to map onto the existing fields first).

## Capability semantics

| Capability | Required? | Notes |
|---|---|---|
| `checkin` | yes for daily-reward games | Must be idempotent. Return `already_done` if already claimed today, not `failed`. |
| `checkin_info` | recommended | Streak / today's status. Read-only. |
| `list_accounts` | recommended | Returns same shape as `verify()`. |
| `mail_claim` | optional | M2+. |
| `stamina_spend` | optional | M2+. Adapter decides which subtask (expedition, commission, ...) the credentials allow. |

## Errors

- **Throw** only for programmer errors (missing required credential keys, unknown capability passed in).
- **Return `{ status: "failed", message }`** for runtime failures (network, rate limit, expired cookie).
- **Return `{ status: "skipped", message }`** when the user can't perform the task right now (e.g. account on cooldown).

## Credentials

- Declare every required field in `credentialFields`. The web flow renders an input for each `sensitive: false` field; sensitive ones get masked.
- Adapters never log credential values. The `Credentials` map is opaque to callers — they pass it through from encrypted DB storage.
- If a credential is rejected by upstream (expired cookie), surface a clear message so the UI can prompt re-link.

## Testing

Mock at the HTTP layer (`fetch`), not at the adapter layer. The contract tests under `src/adapters/__tests__/` (TODO) verify the shape of every registered adapter — capabilities are non-empty, all declared fields are validated, `verify()` returns a typed array.
